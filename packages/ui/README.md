# @wren/ui — Shared Component Library

## What this module owns
- shadcn/ui base components (Button, Avatar, etc.)
- Custom shared layout components (Sidebar, ThemeToggle)
- The `cn()` Tailwind class merging utility

## What it does NOT do
- API calls
- Business logic
- State management beyond local UI state
- Authentication

## Public interface (key exports)

```typescript
import { Button, Avatar, Sidebar, SidebarNavItem, ThemeToggle, cn } from '@wren/ui'
```

## White-label support
All components use CSS variables (`--primary`, `--background`, etc.) defined in `apps/web/src/app/globals.css`.
Tenants override these variables via their `whiteLabelConfig.primaryColor` applied as inline CSS on the dashboard layout element.

## Non-obvious decisions
- **Copy-paste model:** Following shadcn/ui conventions — components live in the repo, not an external package. No vendor lock-in. Fully customisable per ADR-015.
- **Peer dependencies on React:** Listed as `peerDependencies` so the consuming app (Next.js) controls which React version is installed.
- **Tailwind content scanning:** The consuming app's `tailwind.config.ts` must include `../../packages/ui/src/**/*.{ts,tsx}` in its `content` array.
