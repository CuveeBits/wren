'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { Input, cn } from '@wren/ui'
import type { KbSearchMode } from './api'

export interface KbSearchValue {
  query: string
  mode: KbSearchMode
}

interface KbSearchBarProps {
  value: KbSearchValue
  onChange: (value: KbSearchValue) => void
  placeholder?: string
  className?: string
}

export function KbSearchBar({
  value,
  onChange,
  placeholder = 'Search documents…',
  className,
}: KbSearchBarProps) {
  const [query, setQuery] = React.useState(value.query)

  React.useEffect(() => {
    setQuery(value.query)
  }, [value.query])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query !== value.query) {
        onChange({ query, mode: value.mode })
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [onChange, query, value.mode, value.query])

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>

      <div className="inline-flex rounded-lg border border-border bg-muted p-1">
        {(['keyword', 'semantic'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange({ query, mode })}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
              value.mode === mode
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  )
}
