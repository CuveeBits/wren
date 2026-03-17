'use client'

/**
 * C-15 (sprint brief): Widget launcher button + open/close toggle.
 *
 * Floating button (bottom-right).
 * Slide-up panel (desktop) / full-screen drawer (mobile).
 * Smooth CSS transitions.
 * Used on the widget embed page (/widget/[tenantSlug]/chat).
 */
import * as React from 'react'
import { MessageSquare, X } from 'lucide-react'
import { cn } from '@wren/ui'
import type { WebChatConfig } from './api'

interface WidgetLauncherProps {
  config: WebChatConfig
  tenantSlug: string
  isOpen: boolean
  onToggle: () => void
}

export function WidgetLauncher({ config, isOpen, onToggle }: WidgetLauncherProps) {
  const { launcherLabel, brandColor, accentColor, widgetTitle, logoUrl } = config

  return (
    <>
      {/* Floating launcher button */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white shadow-lg transition-all duration-200',
          'hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2',
          isOpen && 'opacity-0 pointer-events-none'
        )}
        style={{ backgroundColor: brandColor }}
        aria-label={isOpen ? 'Close chat' : launcherLabel}
      >
        <MessageSquare className="h-5 w-5" />
        <span>{launcherLabel}</span>
      </button>

      {/* Close button (shown when open) */}
      {isOpen && (
        <button
          type="button"
          onClick={onToggle}
          className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          style={{ backgroundColor: brandColor }}
          aria-label="Close chat"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {/* Chat panel */}
      <div
        className={cn(
          'fixed z-40 bg-background shadow-2xl border border-border transition-all duration-300 ease-out',
          // Desktop: slide-up panel from bottom-right
          'md:bottom-20 md:right-5 md:w-96 md:h-[600px] md:max-h-[80vh] md:rounded-2xl',
          // Mobile: full-screen drawer from bottom
          'bottom-0 left-0 right-0 h-[85vh] rounded-t-2xl md:left-auto md:rounded-2xl',
          isOpen
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-4 opacity-0 pointer-events-none'
        )}
        role="dialog"
        aria-label={widgetTitle}
        aria-modal="true"
      >
        {/* Widget header */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-t-2xl"
          style={{ backgroundColor: brandColor }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-7 w-7 rounded object-contain" aria-hidden="true" />
          ) : (
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: accentColor }}
            >
              W
            </div>
          )}
          <span className="font-semibold text-white flex-1">{widgetTitle}</span>
          <button
            type="button"
            onClick={onToggle}
            className="text-white/80 hover:text-white"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chat content slot (children rendered by parent) */}
        <div className="flex-1 h-[calc(100%-56px)] overflow-hidden">
          {/* Widget chat content is rendered via slot pattern in the parent page */}
        </div>
      </div>
    </>
  )
}
