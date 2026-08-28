import type {
  CreateNoteInput,
  ListNotesQuery,
  NoteRef,
  NoteView,
  UpdateNoteInput,
} from '@pauta/contracts'
import { apiRequest } from '../../shared/api/client.js'

export function listNotes(query: Partial<ListNotesQuery> = {}): Promise<NoteRef[]> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value))
  }
  const search = params.toString()

  return apiRequest<NoteRef[]>(`/notes${search ? `?${search}` : ''}`)
}

export function fetchNote(id: string): Promise<NoteView> {
  return apiRequest<NoteView>(`/notes/${id}`)
}

/** Abre a nota do dia; o servidor cria na primeira visita. */
export function fetchDailyNote(date: string): Promise<NoteView> {
  return apiRequest<NoteView>(`/notes/daily/${date}`)
}

export function createNote(input: CreateNoteInput): Promise<NoteView> {
  return apiRequest<NoteView>('/notes', { method: 'POST', body: input })
}

export function updateNote(id: string, input: UpdateNoteInput): Promise<NoteView> {
  return apiRequest<NoteView>(`/notes/${id}`, { method: 'PATCH', body: input })
}

export function deleteNote(id: string): Promise<void> {
  return apiRequest<void>(`/notes/${id}`, { method: 'DELETE' })
}
