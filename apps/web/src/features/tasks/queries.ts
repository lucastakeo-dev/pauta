import type {
  CreateProjectInput,
  CreateTaskInput,
  ListTasksQuery,
  TaskView,
  UpdateTaskInput,
} from '@pauta/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listLabels } from '../../entities/label/index.js'
import { createProject, listProjects } from '../../entities/project/index.js'
import {
  createTask,
  deleteTask,
  listTasks,
  taskKeys,
  toggleTask,
  updateTask,
} from '../../entities/task/index.js'

/**
 * Estado de servidor da feature de tarefas.
 *
 * As chaves vêm de `entities/task` porque o planner lê a mesma entidade: chave
 * duplicada em duas features é cache que diverge sem ninguém perceber. Qualquer
 * escrita derruba `['tasks']` inteiro, e as de projeto quando a contagem muda.
 */
export const projectKeys = { all: ['projects'] as const }
export const labelKeys = { all: ['labels'] as const }

export function useTasks(query: Partial<ListTasksQuery>) {
  return useQuery({
    queryKey: taskKeys.list(query),
    queryFn: () => listTasks(query),
  })
}

export function useProjects() {
  return useQuery({ queryKey: projectKeys.all, queryFn: () => listProjects() })
}

export function useLabels() {
  return useQuery({ queryKey: labelKeys.all, queryFn: listLabels })
}

/** Depois de escrever, tarefas e contadores da barra lateral podem ter mudado. */
function useInvalidateAll() {
  const queryClient = useQueryClient()

  return () => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.all })
    void queryClient.invalidateQueries({ queryKey: projectKeys.all })
  }
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useCreateTask() {
  const invalidate = useInvalidateAll()

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: invalidate,
  })
}

export function useUpdateTask() {
  const invalidate = useInvalidateAll()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) => updateTask(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteTask() {
  const invalidate = useInvalidateAll()

  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: invalidate,
  })
}

/**
 * Concluir é a ação mais frequente do app, então ela é otimista: a marcação aparece
 * na hora e a requisição corre atrás. Se falhar, o estado anterior é restaurado.
 *
 * Vale notar que o servidor pode devolver um id diferente do enviado — ao concluir uma
 * ocorrência de recorrência, ela é materializada e ganha id próprio. Por isso o
 * `onSettled` revalida em vez de confiar no que ficou na tela.
 */
export function useToggleTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleTask(id, done),

    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all })

      const snapshot = queryClient.getQueriesData<TaskView[]>({ queryKey: taskKeys.all })

      queryClient.setQueriesData<TaskView[]>({ queryKey: taskKeys.all }, (tasks) =>
        tasks?.map((task) =>
          task.id === id
            ? {
                ...task,
                status: done ? 'done' : 'todo',
                completedAt: done ? new Date().toISOString() : null,
              }
            : task,
        ),
      )

      return { snapshot }
    },

    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data)
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all })
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}
