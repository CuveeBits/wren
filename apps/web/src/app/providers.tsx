'use client'

/**
 * Client-side providers wrapper.
 * ThemeProvider requires client context (uses localStorage), so it lives here.
 */
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
