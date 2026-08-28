import type { CreateNoteInput } from '@pauta/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createNote, deleteNote, noteKeys } from '../../entities/note/index.js'

export function useCreateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateNoteInput) => createNote(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: noteKeys.all })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: noteKeys.all })
    },
  })
}
