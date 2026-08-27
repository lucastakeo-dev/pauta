import type { CreateLabelInput, UpdateLabelInput } from '@pauta/contracts'
import type { FastifyReply, FastifyRequest } from 'fastify'
import * as labelModel from '../models/label.model.js'
import { renderLabel, renderLabels } from '../views/task.view.js'

export async function index(request: FastifyRequest, reply: FastifyReply) {
  const labels = await labelModel.list(request.userId)
  return reply.status(200).send(renderLabels(labels))
}

export async function store(
  request: FastifyRequest<{ Body: CreateLabelInput }>,
  reply: FastifyReply,
) {
  const label = await labelModel.create(request.userId, request.body)
  return reply.status(201).send(renderLabel(label))
}

export async function patch(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateLabelInput }>,
  reply: FastifyReply,
) {
  const label = await labelModel.update(request.userId, request.params.id, request.body)
  return reply.status(200).send(renderLabel(label))
}

export async function destroy(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await labelModel.remove(request.userId, request.params.id)
  return reply.status(204).send()
}
