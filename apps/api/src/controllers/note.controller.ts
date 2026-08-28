import type { CreateNoteInput, ListNotesQuery, UpdateNoteInput } from '@pauta/contracts'
import type { FastifyReply, FastifyRequest } from 'fastify'
import * as noteModel from '../models/note.model.js'
import { renderNote, renderNoteRefs } from '../views/note.view.js'

export async function index(
  request: FastifyRequest<{ Querystring: ListNotesQuery }>,
  reply: FastifyReply,
) {
  const notes = await noteModel.list(request.userId, request.query)
  return reply.status(200).send(renderNoteRefs(notes))
}

export async function show(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const note = await noteModel.findById(request.userId, request.params.id)
  return reply.status(200).send(renderNote(note))
}

export async function daily(
  request: FastifyRequest<{ Params: { date: string } }>,
  reply: FastifyReply,
) {
  const note = await noteModel.findOrCreateDaily(request.userId, request.params.date)
  return reply.status(200).send(renderNote(note))
}

export async function store(
  request: FastifyRequest<{ Body: CreateNoteInput }>,
  reply: FastifyReply,
) {
  const note = await noteModel.create(request.userId, request.body)
  return reply.status(201).send(renderNote(note))
}

export async function patch(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateNoteInput }>,
  reply: FastifyReply,
) {
  const note = await noteModel.update(request.userId, request.params.id, request.body)
  return reply.status(200).send(renderNote(note))
}

export async function destroy(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await noteModel.remove(request.userId, request.params.id)
  return reply.status(204).send()
}
