import type { CreateLabelInput, UpdateLabelInput } from '@pauta/contracts'
import { prisma } from '../config/prisma.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'

export type LabelRecord = {
  id: string
  name: string
  color: string
}

const selection = { id: true, name: true, color: true } as const

export async function list(userId: string): Promise<LabelRecord[]> {
  return prisma.label.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    select: selection,
  })
}

export async function create(userId: string, input: CreateLabelInput): Promise<LabelRecord> {
  const existing = await prisma.label.findFirst({
    where: { userId, name: input.name },
    select: { id: true },
  })

  if (existing) {
    throw new ConflictError('label_name_taken', 'Já existe uma etiqueta com esse nome.')
  }

  return prisma.label.create({
    data: { userId, name: input.name, color: input.color },
    select: selection,
  })
}

export async function update(
  userId: string,
  id: string,
  input: UpdateLabelInput,
): Promise<LabelRecord> {
  await assertOwned(userId, id)

  if (input.name !== undefined) {
    const clash = await prisma.label.findFirst({
      where: { userId, name: input.name, id: { not: id } },
      select: { id: true },
    })

    if (clash) {
      throw new ConflictError('label_name_taken', 'Já existe uma etiqueta com esse nome.')
    }
  }

  return prisma.label.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
    select: selection,
  })
}

/** Apagar a etiqueta só desfaz os vínculos (cascade na tabela de junção). */
export async function remove(userId: string, id: string): Promise<void> {
  await assertOwned(userId, id)
  await prisma.label.delete({ where: { id } })
}

export async function assertOwned(userId: string, id: string): Promise<void> {
  const found = await prisma.label.findFirst({ where: { id, userId }, select: { id: true } })

  if (!found) {
    throw new NotFoundError('Etiqueta')
  }
}

/**
 * Confere um conjunto inteiro de uma vez, antes de vincular a uma tarefa.
 *
 * Uma consulta só em vez de N: vincular etiquetas é operação frequente e no caminho
 * crítico de salvar tarefa.
 */
export async function assertAllOwned(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return

  const unique = [...new Set(ids)]
  const found = await prisma.label.count({ where: { userId, id: { in: unique } } })

  if (found !== unique.length) {
    throw new NotFoundError('Etiqueta')
  }
}
