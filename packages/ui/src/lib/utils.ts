import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely, resolving conflicts. Standard shadcn/ui utility. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
