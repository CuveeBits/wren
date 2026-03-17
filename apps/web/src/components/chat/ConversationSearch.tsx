'use client'

/**
 * C-04 (brief): ConversationSearch — debounced search input in the rail.
 *
 * Debounces 300ms. Calls /api/v1/chat/conversations?q=... (S-01).
 * Clear button resets.
 */
import * as React from 'react'
import { Search, X } from 'lucide-react'
import { Input, cn } from '@wren/ui'

interface ConversationSearchProps {
  onSearch: (q: string) => void
  className?: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function ConversationSearch({ onSearch, className }: ConversationSearchProps) {
  const [value, setValue] = React.useState('')
  const debounced = useDebounce(value, 300)

  React.useEffect(() => {
    onSearch(debounced)
  }, [debounced, onSearch])

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search conversations…"
        className="h-8 pl-8 pr-8 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
