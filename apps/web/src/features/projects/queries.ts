import type { CreateProjectInput, MoveProjectInput } from '@pauta/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createProject,
  deleteProject,
  moveProject,
  projectKeys,
  useProjects,
} from '../../entities/project/index.js'
import { taskKeys } from '../../entities/task/index.js'
import { ApiRequestError } from '../../shared/api/client.js'
import { useToast } from '../../shared/ui/toast.js'

const AVISOS = {
  criar: { ok: 'Projeto criado.', erro: 'Não consegui criar o projeto.' },
  mover: { ok: 'Projeto movido.', erro: 'Não consegui mover o projeto.' },
  excluir: { ok: 'Projeto excluído.', erro: 'Não consegui excluir o projeto.' },
}

function mensagem(cause: unknown, padrao: string) {
  return cause instanceof ApiRequestError ? cause.message : padrao
}

export { useProjects }

export function useCreateProject() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
      toast.success(AVISOS.criar.ok)
    },
    // A falha não vira aviso: o diálogo a mostra ao lado do campo, que é onde a pessoa
    // vai corrigir. Nome repetido precisa apontar para o nome.
  })
}

export function useMoveProject() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MoveProjectInput }) => moveProject(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
      toast.success(AVISOS.mover.ok)
    },
    // O 422 de ciclo tem mensagem própria vinda da API — ela explica melhor que a nossa.
    onError: (cause) => toast.error(mensagem(cause, AVISOS.mover.erro)),
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
      // As tarefas voltam para a inbox e os filhos sobem para a raiz: as duas listas mudam.
      void queryClient.invalidateQueries({ queryKey: taskKeys.all })
      toast.success(AVISOS.excluir.ok)
    },
    onError: (cause) => toast.error(mensagem(cause, AVISOS.excluir.erro)),
  })
}
