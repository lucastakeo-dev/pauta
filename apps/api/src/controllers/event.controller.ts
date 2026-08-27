import type { CreateEventInput, ListEventsQuery, UpdateEventInput } from '@pauta/contracts'
import type { FastifyReply, FastifyRequest } from 'fastify'
import * as eventModel from '../models/event.model.js'
import { renderEvent, renderEvents } from '../views/event.view.js'

export async function index(
  request: FastifyRequest<{ Querystring: ListEventsQuery }>,
  reply: FastifyReply,
) {
  const events = await eventModel.listBetween(
    request.userId,
    new Date(request.query.from),
    new Date(request.query.to),
  )

  return reply.status(200).send(renderEvents(events))
}

export async function show(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const event = await eventModel.findById(request.userId, request.params.id)
  return reply.status(200).send(renderEvent(event))
}

export async function store(
  request: FastifyRequest<{ Body: CreateEventInput }>,
  reply: FastifyReply,
) {
  const event = await eventModel.create(request.userId, request.body)
  return reply.status(201).send(renderEvent(event))
}

export async function patch(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateEventInput }>,
  reply: FastifyReply,
) {
  const event = await eventModel.update(request.userId, request.params.id, request.body)
  return reply.status(200).send(renderEvent(event))
}

export async function destroy(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await eventModel.remove(request.userId, request.params.id)
  return reply.status(204).send()
}
