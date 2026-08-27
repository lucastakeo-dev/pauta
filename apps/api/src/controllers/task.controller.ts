import type {
  CreateTaskInput,
  ListTasksQuery,
  ReorderTasksInput,
  ToggleTaskInput,
  UpdateTaskInput,
} from '@pauta/contracts'
import type { FastifyReply, FastifyRequest } from 'fastify'
import * as taskModel from '../models/task.model.js'
import { renderTask, renderTasks } from '../views/task.view.js'

/**
 * Controller: lê a request, chama o model, entrega para a view.
 * Sem regra de negócio — decidir se a tarefa pode ter subtarefa, se a etiqueta é sua
 * ou se a ocorrência existe é trabalho do model.
 */

export async function index(
  request: FastifyRequest<{ Querystring: ListTasksQuery }>,
  reply: FastifyReply,
) {
  const tasks = await taskModel.list(request.userId, request.query)
  return reply.status(200).send(renderTasks(tasks))
}

export async function show(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const task = await taskModel.findById(request.userId, request.params.id)
  return reply.status(200).send(renderTask(task))
}

export async function store(
  request: FastifyRequest<{ Body: CreateTaskInput }>,
  reply: FastifyReply,
) {
  const task = await taskModel.create(request.userId, request.body)
  return reply.status(201).send(renderTask(task))
}

export async function patch(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateTaskInput }>,
  reply: FastifyReply,
) {
  const task = await taskModel.update(request.userId, request.params.id, request.body)
  return reply.status(200).send(renderTask(task))
}

export async function toggle(
  request: FastifyRequest<{ Params: { id: string }; Body: ToggleTaskInput }>,
  reply: FastifyReply,
) {
  const task = await taskModel.toggle(request.userId, request.params.id, request.body.done)
  return reply.status(200).send(renderTask(task))
}

export async function destroy(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await taskModel.remove(request.userId, request.params.id)
  return reply.status(204).send()
}

export async function reorder(
  request: FastifyRequest<{ Body: ReorderTasksInput }>,
  reply: FastifyReply,
) {
  await taskModel.reorder(request.userId, request.body.ids)
  return reply.status(204).send()
}
