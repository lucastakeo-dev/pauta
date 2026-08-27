import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Junta classes resolvendo conflitos do Tailwind (a última vence de verdade). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
