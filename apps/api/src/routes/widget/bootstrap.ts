/**
 * Widget bootstrap route — Sprint 3 (F-09).
 *
 * Serves bootstrap.js: the lightweight embed script (≤8KB minified) that tenants
 * paste into their <head> via a single <script> tag.
 *
 * Security rules:
 * - bootstrap.js itself does NO DB calls (config cached in-memory / Redis, TTL ≥ 60s)
 * - Origin validation happens at session creation and every message send
 * - bootstrap.js validates origin against tenant's allowedOrigins before injecting UI
 *
 * Route: GET /widget/:tenantSlug/bootstrap.js
 * Response: application/javascript (served directly — no Next.js)
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '@wren/db'

interface BootstrapCache {
  allowedOrigins: string[]
  brandColor: string
  accentColor: string
  widgetTitle: string
  launcherLabel: string
  cachedAt: number
}

// In-memory config cache per tenantSlug (TTL: 60s)
const configCache = new Map<string, BootstrapCache>()
const CACHE_TTL_MS = 60_000

async function getBootstrapConfig(tenantSlug: string): Promise<BootstrapCache | null> {
  const cached = configCache.get(tenantSlug)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached
  }

  // Resolve tenant by slug
  const tenant = await db.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  })
  if (!tenant) return null

  const settings = await db.tenantChatSettings.findUnique({
    where: { tenantId: tenant.id },
    select: {
      allowedOrigins: true,
      brandColor: true,
      accentColor: true,
      widgetTitle: true,
      launcherLabel: true,
    },
  })

  const config: BootstrapCache = {
    allowedOrigins: settings?.allowedOrigins ?? [],
    brandColor: settings?.brandColor ?? '#0F172A',
    accentColor: settings?.accentColor ?? '#22C55E',
    widgetTitle: settings?.widgetTitle ?? 'Wren Assistant',
    launcherLabel: settings?.launcherLabel ?? 'Chat with us',
    cachedAt: Date.now(),
  }

  configCache.set(tenantSlug, config)
  return config
}

/**
 * Generate bootstrap.js for a tenant.
 *
 * The script:
 * 1. Validates calling window.location.origin against allowedOrigins
 * 2. Injects launcher button into document.body
 * 3. On click: creates iframe overlay/drawer
 * 4. Passes session token and tenant slug to iframe
 *
 * Target: ≤8KB when minified (this template is ~4KB unminified)
 */
function generateBootstrapScript(tenantSlug: string, config: BootstrapCache, apiBaseUrl: string): string {
  const allowedOriginsJson = JSON.stringify(config.allowedOrigins)
  const brandColor = JSON.stringify(config.brandColor)
  const accentColor = JSON.stringify(config.accentColor)
  const widgetTitle = JSON.stringify(config.widgetTitle)
  const launcherLabel = JSON.stringify(config.launcherLabel)
  const slug = JSON.stringify(tenantSlug)
  const apiBase = JSON.stringify(apiBaseUrl)

  return `
(function(window, document) {
  'use strict';

  var ALLOWED_ORIGINS = ${allowedOriginsJson};
  var BRAND_COLOR = ${brandColor};
  var ACCENT_COLOR = ${accentColor};
  var WIDGET_TITLE = ${widgetTitle};
  var LAUNCHER_LABEL = ${launcherLabel};
  var TENANT_SLUG = ${slug};
  var API_BASE = ${apiBase};
  var SESSION_KEY = 'wren_session_' + TENANT_SLUG;
  var OPEN_KEY = 'wren_open_' + TENANT_SLUG;

  // 1. Origin validation
  var origin = window.location.origin;
  if (ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.indexOf(origin) === -1) {
    console.warn('[Wren] Widget not allowed on origin: ' + origin);
    return;
  }

  // 2. Get or create session key
  function getSessionKey() {
    var key = sessionStorage.getItem(SESSION_KEY);
    if (!key) {
      key = 'sk_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, key);
    }
    return key;
  }

  // 3. Inject styles
  var style = document.createElement('style');
  style.textContent = [
    '#wren-launcher{position:fixed;bottom:20px;right:20px;z-index:999998;',
    'background:' + BRAND_COLOR + ';color:#fff;border:none;border-radius:50px;',
    'padding:12px 20px;font-size:14px;font-weight:600;cursor:pointer;',
    'box-shadow:0 4px 12px rgba(0,0,0,0.2);transition:transform 0.2s,opacity 0.2s;}',
    '#wren-launcher:hover{transform:scale(1.05);}',
    '#wren-overlay{display:none;position:fixed;bottom:0;right:20px;',
    'width:380px;height:600px;z-index:999999;',
    'border-radius:16px 16px 0 0;overflow:hidden;',
    'box-shadow:0 8px 32px rgba(0,0,0,0.25);',
    'transition:transform 0.3s ease,opacity 0.3s ease;',
    'transform:translateY(20px);opacity:0;}',
    '#wren-overlay.wren-open{display:block;transform:translateY(0);opacity:1;}',
    '#wren-iframe{width:100%;height:100%;border:none;display:block;}',
    '@media(max-width:480px){#wren-overlay{width:100%;right:0;height:100%;border-radius:0;}}'
  ].join('');
  document.head.appendChild(style);

  // 4. Inject launcher button
  var launcher = document.createElement('button');
  launcher.id = 'wren-launcher';
  launcher.setAttribute('aria-label', WIDGET_TITLE);
  launcher.textContent = LAUNCHER_LABEL;
  document.body.appendChild(launcher);

  // 5. Inject overlay container (iframe injected lazily on first open)
  var overlay = document.createElement('div');
  overlay.id = 'wren-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', WIDGET_TITLE);
  overlay.setAttribute('aria-modal', 'true');
  document.body.appendChild(overlay);

  var iframe = null;
  var isOpen = false;

  function openWidget() {
    if (!iframe) {
      var sk = getSessionKey();
      var src = API_BASE + '/embed/chat/' + TENANT_SLUG + '?sk=' + encodeURIComponent(sk);
      iframe = document.createElement('iframe');
      iframe.id = 'wren-iframe';
      iframe.src = src;
      iframe.title = WIDGET_TITLE;
      iframe.setAttribute('allow', 'clipboard-write');
      overlay.appendChild(iframe);
    }
    overlay.classList.add('wren-open');
    launcher.setAttribute('aria-expanded', 'true');
    isOpen = true;
    // Trap focus inside overlay
    iframe.focus();
  }

  function closeWidget() {
    overlay.classList.remove('wren-open');
    launcher.setAttribute('aria-expanded', 'false');
    isOpen = false;
    launcher.focus();
  }

  launcher.addEventListener('click', function() {
    if (isOpen) { closeWidget(); } else { openWidget(); }
  });

  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) { closeWidget(); }
  });

  // Handle close message from iframe
  window.addEventListener('message', function(e) {
    if (ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.indexOf(e.origin) === -1) return;
    if (e.data && e.data.type === 'wren:close') { closeWidget(); }
  });

})(window, document);
`.trim()
}

export async function registerWidgetBootstrapRoute(app: FastifyInstance): Promise<void> {
  const apiBaseUrl = process.env['API_BASE_URL'] ?? 'https://app.usewren.ai'

  app.get<{ Params: { tenantSlug: string } }>(
    '/widget/:tenantSlug/bootstrap.js',
    {
      schema: {
        params: {
          type: 'object',
          properties: { tenantSlug: { type: 'string' } },
          required: ['tenantSlug'],
        },
      },
    },
    async (request: FastifyRequest<{ Params: { tenantSlug: string } }>, reply: FastifyReply) => {
      const { tenantSlug } = request.params
      const config = await getBootstrapConfig(tenantSlug)

      if (!config) {
        return reply.status(404).send('// Wren: tenant not found\n')
      }

      const script = generateBootstrapScript(tenantSlug, config, apiBaseUrl)

      return reply
        .header('Content-Type', 'application/javascript; charset=utf-8')
        .header('Cache-Control', 'public, max-age=60, s-maxage=60')
        .header('X-Content-Type-Options', 'nosniff')
        .send(script)
    }
  )

  // Widget branding config endpoint (public, after origin check)
  app.get<{ Params: { tenantSlug: string } }>(
    '/widget/:tenantSlug/config',
    async (request: FastifyRequest<{ Params: { tenantSlug: string } }>, reply: FastifyReply) => {
      const { tenantSlug } = request.params
      const origin = request.headers.origin

      const config = await getBootstrapConfig(tenantSlug)
      if (!config) {
        return reply.status(404).send({ error: 'Tenant not found' })
      }

      // Origin check for non-bootstrap endpoints
      if (config.allowedOrigins.length > 0 && origin && !config.allowedOrigins.includes(origin)) {
        return reply.status(403).send({ error: 'Origin not allowed' })
      }

      return reply.send({
        widgetTitle: config.widgetTitle,
        launcherLabel: config.launcherLabel,
        brandColor: config.brandColor,
        accentColor: config.accentColor,
      })
    }
  )
}
