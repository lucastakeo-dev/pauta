import type { CreateEventInput, EventSource, UpdateEventInput } from '@pauta/contracts'
import { prisma } from '../config/prisma.js'
import { NotFoundError, ValidationError } from '../lib/errors.js'

/**
 * Model de evento: compromisso com hora marcada.
 *
 * Diferente da tarefa, evento não tem status nem conclusão — ele acontece. O planner
 * desenha os dois na mesma linha do tempo, mas só a tarefa ganha caixa de marcar.
 */
export type EventRecord = {
  id: string
  title: string
  description: string | null
  startsAt: Date
  endsAt: Date
  allDay: boolean
  location: string | null
  source: EventSource
  createdAt: Date
  updatedAt: Date
}

const selection = {
  id: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  allDay: true,
  location: true,
  source: true,
  createdAt: true,
  updatedAt: true,
}

/**
 * Eventos que **cruzam** a janela, não só os que começam dentro dela.
 *
 * Uma reunião das 9h às 11h precisa aparecer numa janela que abre às 10h — filtrar só
 * por `startsAt` a faria sumir justamente do dia em que ela está acontecendo.
 */
export async function listBetween(userId: string, from: Date, to: Date): Promise<EventRecord[]> {
  return prisma.event.findMany({
    where: {
      userId,
      startsAt: { lte: to },
      endsAt: { gte: from },
    },
    orderBy: [{ startsAt: 'asc' }],
    select: selection,
  })
}

export async function findById(userId: string, id: string): Promise<EventRecord> {
  const row = await prisma.event.findFirst({ where: { id, userId }, select: selection })

  if (!row) {
    throw new NotFoundError('Evento')
  }

  return row
}

export async function create(userId: string, input: CreateEventInput): Promise<EventRecord> {
  return prisma.event.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      allDay: input.allDay,
      location: input.location ?? null,
      // Eventos criados pelo app são sempre internos; `google` só entra pelo sync.
      source: 'internal',
    },
    select: selection,
  })
}

export async function update(
  userId: string,
  id: string,
  input: UpdateEventInput,
): Promise<EventRecord> {
  const current = await findById(userId, id)

  // Edição parcial pode mandar só um dos extremos: comparamos contra o valor atual,
  // porque o schema sozinho não tem como saber o outro lado.
  const startsAt = input.startsAt ? new Date(input.startsAt) : current.startsAt
  const endsAt = input.endsAt ? new Date(input.endsAt) : current.endsAt

  if (endsAt <= startsAt) {
    throw new ValidationError('O fim precisa vir depois do início.', {
      endsAt: ['O fim precisa vir depois do início.'],
    })
  }

  return prisma.event.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.startsAt !== undefined ? { startsAt } : {}),
      ...(input.endsAt !== undefined ? { endsAt } : {}),
      ...(input.allDay !== undefined ? { allDay: input.allDay } : {}),
      ...(input.location !== undefined ? { location: input.location ?? null } : {}),
    },
    select: selection,
  })
}

export async function remove(userId: string, id: string): Promise<void> {
  await findById(userId, id)
  await prisma.event.delete({ where: { id } })
}
