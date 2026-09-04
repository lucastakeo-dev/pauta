import type { CreateCommentInput, UpdateCommentInput } from '@pauta/contracts'
import type { FastifyReply, FastifyRequest } from 'fastify'
import * as commentModel from '../models/comment.model.js'
import { renderComment, renderComments } from '../views/comment.view.js'

/** Controller: lê a request, chama o model, entrega para a view. */

type TaskParams = { taskId: string }
type CommentParams = { taskId: string; id: string }

export async function index(request: FastifyRequest<{ Params: TaskParams }>, reply: FastifyReply) {
  const comments = await commentModel.list(request.userId, request.params.taskId)
  return reply.status(200).send(renderComments(comments))
}

export async function store(
  request: FastifyRequest<{ Params: TaskParams; Body: CreateCommentInput }>,
  reply: FastifyReply,
) {
  const comment = await commentModel.create(request.userId, request.params.taskId, request.body)
  return reply.status(201).send(renderComment(comment))
}

export async function patch(
  request: FastifyRequest<{ Params: CommentParams; Body: UpdateCommentInput }>,
  reply: FastifyReply,
) {
  const comment = await commentModel.update(
    request.userId,
    request.params.taskId,
    request.params.id,
    request.body,
  )

  return reply.status(200).send(renderComment(comment))
}

export async function destroy(
  request: FastifyRequest<{ Params: CommentParams }>,
  reply: FastifyReply,
) {
  await commentModel.remove(request.userId, request.params.taskId, request.params.id)
  return reply.status(204).send()
}
