import type { CreateProjectInput, MoveProjectInput, UpdateProjectInput } from '@pauta/contracts'
import type { FastifyReply, FastifyRequest } from 'fastify'
import * as projectModel from '../models/project.model.js'
import { renderProject, renderProjects } from '../views/task.view.js'

export async function index(
  request: FastifyRequest<{ Querystring: { includeArchived?: boolean } }>,
  reply: FastifyReply,
) {
  const projects = await projectModel.list(request.userId, {
    includeArchived: request.query.includeArchived ?? false,
  })

  return reply.status(200).send(renderProjects(projects))
}

export async function store(
  request: FastifyRequest<{ Body: CreateProjectInput }>,
  reply: FastifyReply,
) {
  const project = await projectModel.create(request.userId, request.body)
  return reply.status(201).send(renderProject(project))
}

export async function patch(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateProjectInput }>,
  reply: FastifyReply,
) {
  const project = await projectModel.update(request.userId, request.params.id, request.body)
  return reply.status(200).send(renderProject(project))
}

export async function destroy(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await projectModel.remove(request.userId, request.params.id)
  return reply.status(204).send()
}

export async function move(
  request: FastifyRequest<{ Params: { id: string }; Body: MoveProjectInput }>,
  reply: FastifyReply,
) {
  const project = await projectModel.move(request.userId, request.params.id, request.body)
  return reply.status(200).send(renderProject(project))
}
