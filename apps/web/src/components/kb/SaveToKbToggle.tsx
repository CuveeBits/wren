'use client'

import { cn } from '@wren/ui'
import { useTranslations } from '@/i18n/translations-context'

interface SaveToKbToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function SaveToKbToggle({ checked, onCheckedChange }: SaveToKbToggleProps) {
  const t = useTranslations()
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{t('prompt.saveToKb')}</p>
        <p className="text-xs text-muted-foreground">{t('prompt.saveToKbDesc')}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 items-center rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 rounded-full bg-background shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  )
}
