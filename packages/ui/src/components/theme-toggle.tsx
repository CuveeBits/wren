'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '../lib/utils'

interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Current theme — provided by the parent (e.g. next-themes useTheme). */
  theme?: string
  /** Callback when user toggles theme. */
  onToggle?: () => void
}

/**
 * Dark/light mode toggle button.
 * Works with next-themes: pass `theme` and `onToggle` from `useTheme()`.
 *
 * White-label: inherits CSS variable --primary so it matches tenant branding.
 */
export function ThemeToggle({ theme, onToggle, className, ...props }: ThemeToggleProps) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      {...props}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
