import type { CommentView } from '@pauta/contracts'
import type { CommentRecord } from '../models/comment.model.js'

/**
 * View dos comentários. Mapeamento campo a campo, como as outras: coluna nova só
 * aparece na API se alguém escrever a linha aqui.
 */

export function renderComment(comment: CommentRecord): CommentView {
  return {
    id: comment.id,
    taskId: comment.taskId,
    body: comment.body,
    author: { id: comment.author.id, name: comment.author.name },
    createdAt: comment.createdAt.toISOString(),
    editedAt: comment.editedAt ? comment.editedAt.toISOString() : null,
  }
}

export function renderComments(comments: CommentRecord[]): CommentView[] {
  return comments.map(renderComment)
}
