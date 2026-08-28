/** Chaves de cache das notas, compartilhadas por quem lê e por quem invalida. */
export const noteKeys = {
  all: ['notes'] as const,
  list: (search?: string) => ['notes', 'list', search ?? ''] as const,
  detail: (id: string) => ['notes', 'detail', id] as const,
  daily: (date: string) => ['notes', 'daily', date] as const,
}
