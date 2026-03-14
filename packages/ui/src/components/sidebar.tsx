import * as React from 'react'
import { cn } from '../lib/utils'

// ─── Sidebar root ─────────────────────────────────────────────────────────────

interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  collapsed?: boolean
}

export function Sidebar({ collapsed = false, className, children, ...props }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
      {...props}
    >
      {children}
    </aside>
  )
}

// ─── Sidebar header ───────────────────────────────────────────────────────────

export function SidebarHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex h-16 items-center border-b border-border px-4', className)} {...props}>
      {children}
    </div>
  )
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

export function SidebarContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-1 flex-col gap-1 overflow-y-auto p-2', className)} {...props}>
      {children}
    </div>
  )
}

// ─── Sidebar footer ───────────────────────────────────────────────────────────

export function SidebarFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-t border-border p-4', className)} {...props}>
      {children}
    </div>
  )
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────

interface SidebarNavItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  icon?: React.ReactNode
  label: string
  active?: boolean
  collapsed?: boolean
}

export function SidebarNavItem({
  icon,
  label,
  active = false,
  collapsed = false,
  className,
  ...props
}: SidebarNavItemProps) {
  return (
    <a
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        collapsed && 'justify-center px-2',
        className
      )}
      title={collapsed ? label : undefined}
      {...props}
    >
      {icon && <span className="h-5 w-5 shrink-0">{icon}</span>}
      {!collapsed && <span>{label}</span>}
    </a>
  )
}

// ─── Sidebar section label ────────────────────────────────────────────────────

interface SidebarSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  collapsed?: boolean
}

export function SidebarSection({ label, collapsed = false, className, children, ...props }: SidebarSectionProps) {
  return (
    <div className={cn('py-1', className)} {...props}>
      {!collapsed && (
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      )}
      {children}
    </div>
  )
}
