'use client'

import { Badge, cn } from '@wren/ui'

interface KbTagBadgeProps {
  tag: string
  className?: string
}

export function KbTagBadge({ tag, className }: KbTagBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', className)}
    >
      {tag}
    </Badge>
  )
}
