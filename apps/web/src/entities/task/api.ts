import type {
  CreateTaskInput,
  ListTasksQuery,
  TaskView,
  ToggleTaskInput,
  UpdateTaskInput,
} from '@pauta/contracts'
import { apiRequest } from '../../shared/api/client.js'

/** Monta a query string a partir dos filtros, omitindo o que não foi informado. */
function toQueryString(query: Partial<ListTasksQuery>): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item))
    } else {
      params.set(key, String(value))
    }
  }

  const search = params.toString()
  return search ? `?${search}` : ''
}

export function listTasks(query: Partial<ListTasksQuery> = {}): Promise<TaskView[]> {
  return apiRequest<TaskView[]>(`/tasks${toQueryString(query)}`)
}

export function createTask(input: CreateTaskInput): Promise<TaskView> {
  return apiRequest<TaskView>('/tasks', { method: 'POST', body: input })
}

export function updateTask(id: string, input: UpdateTaskInput): Promise<TaskView> {
  return apiRequest<TaskView>(`/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: input })
}

export function toggleTask(id: string, done: ToggleTaskInput['done']): Promise<TaskView> {
  return apiRequest<TaskView>(`/tasks/${encodeURIComponent(id)}/toggle`, {
    method: 'POST',
    body: { done },
  })
}

export function deleteTask(id: string): Promise<void> {
  return apiRequest<void>(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
