'use client'

/**
 * C-01 (Sprint 4): LanguageSelector
 *
 * Compact dropdown for selecting the chat language.
 * Options: Auto (backend-detected) + the 5 supported languages.
 * Emits ISO 639-1 code or 'auto'.
 */
import * as React from 'react'
import { Globe } from 'lucide-react'
import { cn } from '@wren/ui'
import { SUPPORTED_LANGUAGES, LANGUAGE_AUTO } from '@/lib/i18n-chat'

interface LanguageSelectorProps {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
  className?: string
}

export function LanguageSelector({
  value,
  onChange,
  disabled,
  className,
}: LanguageSelectorProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label="Select language"
        className={cn(
          'appearance-none bg-transparent text-xs text-muted-foreground',
          'border-none outline-none cursor-pointer',
          'hover:text-foreground focus:text-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'pr-1'
        )}
      >
        <option value={LANGUAGE_AUTO}>Auto</option>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  )
}
