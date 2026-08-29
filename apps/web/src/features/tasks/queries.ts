import type { CreateTaskInput, ListTasksQuery, TaskView, UpdateTaskInput } from '@pauta/contracts'
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLabels } from '../../entities/label/index.js'
import { projectKeys, useProjects } from '../../entities/project/index.js'
import {
  createTask,
  deleteTask,
  listTasks,
  taskKeys,
  toggleTask,
  updateTask,
} from '../../entities/task/index.js'
import { ApiRequestError } from '../../shared/api/client.js'
import { useToast } from '../../shared/ui/toast.js'

/**
 * Retorno de cada ação. Sucesso e falha ficam lado a lado de propósito: é o par que
 * define o que a pessoa vê, e separá-los faria um mudar sem o outro.
 */
const AVISOS = {
  criar: { ok: 'Tarefa criada.', erro: 'Não consegui criar a tarefa.' },
  editar: { ok: 'Alteração salva.', erro: 'Não consegui salvar a alteração.' },
  excluir: { ok: 'Tarefa excluída.', erro: 'Não consegui excluir a tarefa.' },
  concluir: { ok: 'Tarefa concluída.', erro: 'Não consegui atualizar a tarefa.' },
  reabrir: { ok: 'Tarefa reaberta.', erro: 'Não consegui atualizar a tarefa.' },
}

/** Chave da criação, para a lista saber quais tarefas ainda estão a caminho. */
const CREATE_TASK_KEY = ['tasks', 'create'] as const

function mensagem(cause: unknown, padrao: string) {
  return cause instanceof ApiRequestError ? cause.message : padrao
}

/**
 * Estado de servidor da feature de tarefas.
 *
 * As chaves vêm de `entities/task` porque o planner lê a mesma entidade: chave
 * duplicada em duas features é cache que diverge sem ninguém perceber. Qualquer
 * escrita derruba `['tasks']` inteiro, e as de projeto quando a contagem muda.
 */
export function useTasks(query: Partial<ListTasksQuery>) {
  return useQuery({
    queryKey: taskKeys.list(query),
    queryFn: () => listTasks(query),
  })
}

// Reexportados para as telas desta feature continuarem importando de um lugar só.
export { useLabels, useProjects }

/** Depois de escrever, tarefas e contadores da barra lateral podem ter mudado. */
function useInvalidateAll() {
  const queryClient = useQueryClient()

  return () => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.all })
    void queryClient.invalidateQueries({ queryKey: projectKeys.all })
  }
}

/**
 * Aplica uma mudança em todas as listas de tarefas em cache e devolve como desfazê-la.
 *
 * Toda escrita otimista precisa da mesma sequência: parar as buscas em voo (senão uma
 * resposta antiga chega depois e sobrescreve o que acabamos de aplicar), guardar o
 * estado atual, e alterar. A parte que varia é só o `patch`.
 */
function useOptimisticTaskWrite() {
  const queryClient = useQueryClient()

  return async (patch: (tasks: TaskView[]) => TaskView[]) => {
    await queryClient.cancelQueries({ queryKey: taskKeys.all })

    const snapshot = queryClient.getQueriesData<TaskView[]>({ queryKey: taskKeys.all })

    queryClient.setQueriesData<TaskView[]>({ queryKey: taskKeys.all }, (tasks) =>
      tasks ? patch(tasks) : tasks,
    )

    return {
      restore: () => {
        for (const [key, data] of snapshot) queryClient.setQueryData(key, data)
      },
    }
  }
}

/**
 * Criar não é otimista: o id, a posição e a data interpretada vêm do servidor, então
 * uma linha inventada aqui seria um palpite que muda de forma ao confirmar. O lugar da
 * espera é `usePendingTasks`, que desenha a tarefa a caminho a partir do que foi
 * enviado — sem fingir que ela já existe.
 */
export function useCreateTask() {
  const invalidate = useInvalidateAll()
  const toast = useToast()

  return useMutation({
    mutationKey: CREATE_TASK_KEY,
    mutationFn: (input: CreateTaskInput) => createTask(input),

    onSuccess: () => {
      invalidate()
      toast.success(AVISOS.criar.ok)
    },

    onError: (cause) => toast.error(mensagem(cause, AVISOS.criar.erro)),
  })
}

export type PendingTask = { id: number; input: CreateTaskInput }

/**
 * Tarefas enviadas e ainda sem resposta, na ordem em que foram digitadas.
 *
 * Lidas do estado da própria mutação em vez de gravadas no cache: uma tarefa a caminho
 * não é estado de servidor, e escrevê-la ali obrigaria a inventar um id para depois
 * removê-lo. O `mutationId` já é único e estável, então serve de chave na lista — duas
 * tarefas com o mesmo título não se confundem.
 */
export function usePendingTasks(): PendingTask[] {
  return useMutationState({
    filters: { mutationKey: CREATE_TASK_KEY, status: 'pending' },
    select: (mutation) => ({
      id: mutation.mutationId,
      input: mutation.state.variables as CreateTaskInput,
    }),
  })
}

/**
 * Campos que a edição consegue prever sozinha.
 *
 * `labelIds` e `recurrence` ficam de fora de propósito: chegam como id e como regra, e
 * a tela mostra nome e resumo — traduzir isso aqui seria repetir no cliente uma
 * conversão que é do servidor. Esses dois só aparecem quando a revalidação responde.
 */
function previewOf(input: UpdateTaskInput): Partial<TaskView> {
  const preview: Partial<TaskView> = {}

  if (input.title !== undefined) preview.title = input.title
  if (input.notes !== undefined) preview.notes = input.notes ?? null
  if (input.status !== undefined) preview.status = input.status
  if (input.priority !== undefined) preview.priority = input.priority
  if (input.dueAt !== undefined) preview.dueAt = input.dueAt ?? null
  if (input.scheduledStart !== undefined) preview.scheduledStart = input.scheduledStart ?? null
  if (input.scheduledEnd !== undefined) preview.scheduledEnd = input.scheduledEnd ?? null
  if (input.estimateMin !== undefined) preview.estimateMin = input.estimateMin ?? null

  return preview
}

export function useUpdateTask() {
  const invalidate = useInvalidateAll()
  const optimistic = useOptimisticTaskWrite()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) => updateTask(id, input),

    onMutate: ({ id, input }) => {
      const preview = previewOf(input)
      return optimistic((tasks) =>
        tasks.map((task) => (task.id === id ? { ...task, ...preview } : task)),
      )
    },

    onSuccess: () => toast.success(AVISOS.editar.ok),

    onError: (cause, _variables, context) => {
      context?.restore()
      toast.error(mensagem(cause, AVISOS.editar.erro))
    },

    onSettled: invalidate,
  })
}

export function useDeleteTask() {
  const invalidate = useInvalidateAll()
  const optimistic = useOptimisticTaskWrite()
  const toast = useToast()

  return useMutation({
    mutationFn: (id: string) => deleteTask(id),

    onMutate: (id) => optimistic((tasks) => tasks.filter((task) => task.id !== id)),

    onSuccess: () => toast.success(AVISOS.excluir.ok),

    onError: (cause, _id, context) => {
      context?.restore()
      toast.error(mensagem(cause, AVISOS.excluir.erro))
    },

    onSettled: invalidate,
  })
}

/**
 * Concluir é a ação mais frequente do app: a marcação aparece na hora e a requisição
 * corre atrás.
 *
 * Vale notar que o servidor pode devolver um id diferente do enviado — ao concluir uma
 * ocorrência de recorrência, ela é materializada e ganha id próprio. Por isso o
 * `onSettled` revalida em vez de confiar no que ficou na tela.
 */
export function useToggleTask() {
  const invalidate = useInvalidateAll()
  const optimistic = useOptimisticTaskWrite()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleTask(id, done),

    onMutate: ({ id, done }) =>
      optimistic((tasks) =>
        tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                status: done ? 'done' : 'todo',
                completedAt: done ? new Date().toISOString() : null,
              }
            : task,
        ),
      ),

    onSuccess: (_data, { done }) => toast.success(done ? AVISOS.concluir.ok : AVISOS.reabrir.ok),

    onError: (cause, _variables, context) => {
      context?.restore()
      toast.error(mensagem(cause, AVISOS.concluir.erro))
    },

    onSettled: invalidate,
  })
}
