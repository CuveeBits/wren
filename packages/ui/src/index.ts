/**
 * @wren/ui — Shared Component Library.
 *
 * shadcn/ui base components + custom shared components.
 * White-label ready: all components use CSS variables (--primary, --background, etc.)
 * so tenant branding is applied globally via CSS variable overrides.
 *
 * Rule: No API calls or business logic in components. Pure presentational.
 */

// Utilities
export { cn } from './lib/utils'

// Components
export { Button, buttonVariants } from './components/button'
export type { ButtonProps } from './components/button'

export { Avatar } from './components/avatar'

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarNavItem,
  SidebarSection,
} from './components/sidebar'

export { ThemeToggle } from './components/theme-toggle'

export { Input } from './components/input'
export type { InputProps } from './components/input'

export { Textarea } from './components/textarea'
export type { TextareaProps } from './components/textarea'

export { Label } from './components/label'
export type { LabelProps } from './components/label'

export { Checkbox } from './components/checkbox'
export type { CheckboxProps } from './components/checkbox'

export { Select } from './components/select'
export type { SelectProps } from './components/select'

export { Badge, badgeVariants } from './components/badge'
export type { BadgeProps } from './components/badge'

export { Skeleton } from './components/skeleton'
