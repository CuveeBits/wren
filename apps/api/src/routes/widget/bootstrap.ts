/**
 * Widget bootstrap.js helpers — Sprint 3 (F-09).
 *
 * Provides:
 * - getBootstrapConfigCached: loads tenant config with in-memory TTL cache (no DB on cache hit)
 * - generateBootstrapScript: generates the full ≤8KB embed script
 *
 * The route itself lives in widget/index.ts.
 *
 * Security rules:
 * - No DB calls when config is cached (TTL ≥ 60s — satisfies "no DB call in bootstrap.js")
 * - bootstrap.js origin validation happens client-side (defence in depth)
 * - Real auth gate is the HMAC-signed session token on all write operations
 *
 * Target: generated script ≤8KB minified.
 */
import { db } from '@wren/db'

export interface BootstrapConfig {
  allowedOrigins: string[]
  brandColor: string
  accentColor: string
  widgetTitle: string
  launcherLabel: string
  cachedAt: number
}

// In-memory config cache per tenantSlug (TTL: 60s)
const configCache = new Map<string, BootstrapConfig>()
const CACHE_TTL_MS = 60_000

/**
 * Get tenant branding config for bootstrap.js, with in-memory cache.
 * Returns null if tenant slug not found.
 * No DB call on cache hit — satisfies the <100ms bootstrap.js response target.
 */
export async function getBootstrapConfigCached(tenantSlug: string): Promise<BootstrapConfig | null> {
  const cached = configCache.get(tenantSlug)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached
  }

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

  const config: BootstrapConfig = {
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
 * Generate the full bootstrap.js embed script for a tenant.
 *
 * The script:
 * 1. Validates window.location.origin against allowedOrigins (defence in depth)
 * 2. Injects CSS styles for launcher + widget overlay
 * 3. Injects a launcher button into document.body
 * 4. On click: creates iframe overlay pointing to /embed/chat/:tenantSlug
 * 5. Manages open/close state + keyboard (Escape) + window.postMessage close
 * 6. Passes session key from sessionStorage to iframe via URL param
 *
 * Output: ~4KB unminified, well under the ≤8KB target.
 */
export function generateBootstrapScript(
  tenantSlug: string,
  config: BootstrapConfig,
  apiBaseUrl: string
): string {
  const allowedOriginsJson = JSON.stringify(config.allowedOrigins)
  const brandColor = JSON.stringify(config.brandColor)
  const accentColor = JSON.stringify(config.accentColor)
  const widgetTitle = JSON.stringify(config.widgetTitle)
  const launcherLabel = JSON.stringify(config.launcherLabel)
  const slug = JSON.stringify(tenantSlug)
  const apiBase = JSON.stringify(apiBaseUrl)

  return `
(function(window,document){
'use strict';
var ALLOWED_ORIGINS=${allowedOriginsJson};
var BRAND=${brandColor};
var ACCENT=${accentColor};
var TITLE=${widgetTitle};
var LABEL=${launcherLabel};
var SLUG=${slug};
var BASE=${apiBase};
var SK_KEY='wren_sk_'+SLUG;
var OPEN=false;

// 1. Origin validation (defence in depth — real auth is HMAC session token)
var origin=window.location.origin;
if(ALLOWED_ORIGINS.length>0&&ALLOWED_ORIGINS.indexOf(origin)===-1){
  console.warn('[Wren] Widget not allowed on origin: '+origin);return;
}

// 2. Session key (stored in sessionStorage, never sent as cookie)
function sk(){
  var k=sessionStorage.getItem(SK_KEY);
  if(!k){k='sk_'+Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem(SK_KEY,k);}
  return k;
}

// 3. Styles
var s=document.createElement('style');
s.textContent=[
'#wren-btn{position:fixed;bottom:20px;right:20px;z-index:999998;background:'+BRAND+';color:#fff;',
'border:none;border-radius:50px;padding:12px 20px;font-size:14px;font-weight:600;cursor:pointer;',
'box-shadow:0 4px 12px rgba(0,0,0,.2);transition:transform .2s;}',
'#wren-btn:hover{transform:scale(1.05);}',
'#wren-overlay{display:none;position:fixed;bottom:0;right:20px;width:380px;height:600px;',
'z-index:999999;border-radius:16px 16px 0 0;overflow:hidden;',
'box-shadow:0 8px 32px rgba(0,0,0,.25);transition:opacity .3s,transform .3s;',
'opacity:0;transform:translateY(20px);}',
'#wren-overlay.wren-open{display:block;opacity:1;transform:translateY(0);}',
'#wren-iframe{width:100%;height:100%;border:none;display:block;}',
'@media(max-width:480px){#wren-overlay{width:100%;right:0;height:100%;border-radius:0;}}'
].join('');
document.head.appendChild(s);

// 4. Launcher button
var btn=document.createElement('button');
btn.id='wren-btn';
btn.setAttribute('aria-label',TITLE);
btn.setAttribute('aria-expanded','false');
btn.textContent=LABEL;
document.body.appendChild(btn);

// 5. Overlay container
var overlay=document.createElement('div');
overlay.id='wren-overlay';
overlay.setAttribute('role','dialog');
overlay.setAttribute('aria-label',TITLE);
overlay.setAttribute('aria-modal','true');
document.body.appendChild(overlay);

var iframe=null;

function open(){
  if(!iframe){
    iframe=document.createElement('iframe');
    iframe.id='wren-iframe';
    iframe.src=BASE+'/embed/chat/'+SLUG+'?sk='+encodeURIComponent(sk());
    iframe.title=TITLE;
    iframe.setAttribute('allow','clipboard-write');
    overlay.appendChild(iframe);
  }
  overlay.classList.add('wren-open');
  btn.setAttribute('aria-expanded','true');
  OPEN=true;
  setTimeout(function(){iframe.focus();},50);
}

function close(){
  overlay.classList.remove('wren-open');
  btn.setAttribute('aria-expanded','false');
  OPEN=false;
  btn.focus();
}

btn.addEventListener('click',function(){if(OPEN){close();}else{open();}});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&OPEN){close();}});
window.addEventListener('message',function(e){
  if(ALLOWED_ORIGINS.length>0&&ALLOWED_ORIGINS.indexOf(e.origin)===-1)return;
  if(e.data&&e.data.type==='wren:close')close();
  if(e.data&&e.data.type==='wren:open')open();
});
})(window,document);
`.trim()
}
