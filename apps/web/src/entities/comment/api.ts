import type { CommentView, CreateCommentInput, UpdateCommentInput } from '@pauta/contracts'
import { apiRequest } from '../../shared/api/client.js'

/** O id da tarefa pode ser virtual (`uuid@AAAA-MM-DD`), então sempre vai escapado. */
function base(taskId: string): string {
  return `/tasks/${encodeURIComponent(taskId)}/comments`
}

export function listComments(taskId: string): Promise<CommentView[]> {
  return apiRequest<CommentView[]>(base(taskId))
}

export function createComment(taskId: string, input: CreateCommentInput): Promise<CommentView> {
  return apiRequest<CommentView>(base(taskId), { method: 'POST', body: input })
}

export function updateComment(
  taskId: string,
  id: string,
  input: UpdateCommentInput,
): Promise<CommentView> {
  return apiRequest<CommentView>(`${base(taskId)}/${id}`, { method: 'PATCH', body: input })
}

export function deleteComment(taskId: string, id: string): Promise<void> {
  return apiRequest<void>(`${base(taskId)}/${id}`, { method: 'DELETE' })
}
