import type { CreateNoteInput } from '@pauta/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createNote, deleteNote, noteKeys } from '../../entities/note/index.js'
import { apiErrorDetail } from '../../shared/api/client.js'
import { useToast } from '../../shared/ui/toast.js'

const AVISOS = {
  criar: { ok: 'Nota criada.', erro: 'Não consegui criar a nota.' },
  excluir: { ok: 'Nota excluída.', erro: 'Não consegui excluir a nota.' },
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (input: CreateNoteInput) => createNote(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: noteKeys.all })
      toast.success(AVISOS.criar.ok)
    },
    onError: (cause) => toast.error(AVISOS.criar.erro, { description: apiErrorDetail(cause) }),
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: noteKeys.all })
      toast.success(AVISOS.excluir.ok)
    },
    onError: (cause) => toast.error(AVISOS.excluir.erro, { description: apiErrorDetail(cause) }),
  })
}
