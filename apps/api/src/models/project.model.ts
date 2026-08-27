import type { CreateProjectInput, TaskStatus, UpdateProjectInput } from '@pauta/contracts'
import { prisma } from '../config/prisma.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'

/**
 * Model de projeto: regra de negócio + persistência.
 *
 * Toda consulta filtra por `userId`. Não é só segurança — é o que garante que
 * "não encontrado" e "de outra pessoa" respondam igual, sem revelar dado alheio.
 */
export type ProjectRecord = {
  id: string
  name: string
  color: string
  icon: string | null
  position: number
  archivedAt: Date | null
  openTaskCount: number
}

/** Tarefas que ainda contam como pendentes na barra lateral. */
const OPEN_STATUSES: TaskStatus[] = ['inbox', 'todo', 'doing']

// Sem `as const`: o Prisma espera arrays mutáveis nos filtros, e `as const` os
// tornaria readonly.
const selection = {
  id: true,
  name: true,
  color: true,
  icon: true,
  position: true,
  archivedAt: true,
  _count: { select: { tasks: { where: { status: { in: OPEN_STATUSES } } } } },
}

type Row = {
  id: string
  name: string
  color: string
  icon: string | null
  position: number
  archivedAt: Date | null
  _count: { tasks: number }
}

function toRecord(row: Row): ProjectRecord {
  const { _count, ...rest } = row
  return { ...rest, openTaskCount: _count.tasks }
}

export async function list(
  userId: string,
  options: { includeArchived?: boolean } = {},
): Promise<ProjectRecord[]> {
  const rows = await prisma.project.findMany({
    where: {
      userId,
      ...(options.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: selection,
  })

  return rows.map(toRecord)
}

export async function create(userId: string, input: CreateProjectInput): Promise<ProjectRecord> {
  const existing = await prisma.project.findFirst({
    where: { userId, name: input.name },
    select: { id: true },
  })

  if (existing) {
    throw new ConflictError('project_name_taken', 'Já existe um projeto com esse nome.')
  }

  // Novo projeto entra no fim da lista.
  const last = await prisma.project.findFirst({
    where: { userId },
    orderBy: { position: 'desc' },
    select: { position: true },
  })

  const row = await prisma.project.create({
    data: {
      userId,
      name: input.name,
      color: input.color,
      icon: input.icon ?? null,
      position: (last?.position ?? -1) + 1,
    },
    select: selection,
  })

  return toRecord(row)
}

export async function update(
  userId: string,
  id: string,
  input: UpdateProjectInput,
): Promise<ProjectRecord> {
  await assertOwned(userId, id)

  if (input.name !== undefined) {
    const clash = await prisma.project.findFirst({
      where: { userId, name: input.name, id: { not: id } },
      select: { id: true },
    })

    if (clash) {
      throw new ConflictError('project_name_taken', 'Já existe um projeto com esse nome.')
    }
  }

  const row = await prisma.project.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.icon !== undefined ? { icon: input.icon ?? null } : {}),
      ...(input.archived !== undefined ? { archivedAt: input.archived ? new Date() : null } : {}),
    },
    select: selection,
  })

  return toRecord(row)
}

/**
 * Apagar o projeto não apaga as tarefas: elas voltam para a inbox (o schema usa
 * `onDelete: SetNull` em `projectId`). Perder tarefa por arrumar a barra lateral
 * seria uma surpresa cara.
 */
export async function remove(userId: string, id: string): Promise<void> {
  await assertOwned(userId, id)
  await prisma.project.delete({ where: { id } })
}

/** Reordena em bloco: recebe a ordem inteira e grava as posições numa transação. */
export async function reorder(userId: string, ids: string[]): Promise<ProjectRecord[]> {
  const owned = await prisma.project.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true },
  })

  if (owned.length !== ids.length) {
    throw new NotFoundError('Projeto')
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.project.update({ where: { id }, data: { position: index } })),
  )

  return list(userId, { includeArchived: true })
}

/** Confere dono. Usado aqui e pelo model de tarefa antes de vincular. */
export async function assertOwned(userId: string, id: string): Promise<void> {
  const found = await prisma.project.findFirst({ where: { id, userId }, select: { id: true } })

  if (!found) {
    throw new NotFoundError('Projeto')
  }
}
