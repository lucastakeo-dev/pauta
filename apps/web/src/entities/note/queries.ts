import { useQuery } from '@tanstack/react-query'
import { fetchDailyNote, fetchNote, listNotes } from './api.js'
import { noteKeys } from './keys.js'

export function useNotes(search?: string) {
  return useQuery({
    queryKey: noteKeys.list(search),
    queryFn: () => listNotes(search ? { search } : {}),
  })
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: noteKeys.detail(id ?? ''),
    queryFn: () => fetchNote(id as string),
    enabled: id !== null,
  })
}

/** A nota do dia é criada pelo servidor na primeira visita — por isso é query, não mutation. */
export function useDailyNote(date: string) {
  return useQuery({
    queryKey: noteKeys.daily(date),
    queryFn: () => fetchDailyNote(date),
  })
}
