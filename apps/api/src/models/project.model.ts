import type {
  CreateProjectInput,
  MoveProjectInput,
  TaskStatus,
  UpdateProjectInput,
} from '@pauta/contracts'
import { prisma } from '../config/prisma.js'
import { ConflictError, DomainError, NotFoundError } from '../lib/errors.js'

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
  parentId: string | null
  childCount: number
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
  parentId: true,
  _count: {
    select: {
      tasks: { where: { status: { in: OPEN_STATUSES } } },
      children: true,
    },
  },
}

type Row = {
  id: string
  name: string
  color: string
  icon: string | null
  position: number
  archivedAt: Date | null
  parentId: string | null
  _count: { tasks: number; children: number }
}

function toRecord(row: Row): ProjectRecord {
  const { _count, ...rest } = row
  return { ...rest, openTaskCount: _count.tasks, childCount: _count.children }
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
    // A ordenação é por profundidade lógica: irmãos ficam juntos e em ordem, então o
    // cliente monta a árvore numa passada, sem reordenar.
    orderBy: [{ parentId: 'asc' }, { position: 'asc' }, { name: 'asc' }],
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

  const parentId = input.parentId ?? null
  if (parentId) await assertOwned(userId, parentId)

  const row = await prisma.project.create({
    data: {
      userId,
      name: input.name,
      color: input.color,
      icon: input.icon ?? null,
      parentId,
      position: await nextPosition(userId, parentId),
    },
    select: selection,
  })

  return toRecord(row)
}

/** Fim da fila entre os irmãos daquele pai. */
async function nextPosition(userId: string, parentId: string | null): Promise<number> {
  const last = await prisma.project.findFirst({
    where: { userId, parentId },
    orderBy: { position: 'desc' },
    select: { position: true },
  })

  return (last?.position ?? -1) + 1
}

/**
 * Muda o pai e a ordem entre irmãos.
 *
 * A regra que justifica a rota separada: um projeto não pode entrar na própria
 * subárvore. `Trabalho → Plataforma → Trabalho` desligaria os três da raiz, e eles
 * sumiriam da barra lateral sem terem sido apagados — dado vivo e inalcançável.
 */
export async function move(
  userId: string,
  id: string,
  input: MoveProjectInput,
): Promise<ProjectRecord> {
  await assertOwned(userId, id)

  const parentId = input.parentId
  if (parentId) {
    await assertOwned(userId, parentId)

    if (parentId === id || (await isDescendant(userId, parentId, id))) {
      throw new DomainError(
        'project_cycle',
        'Um projeto não pode ser movido para dentro de si mesmo.',
        422,
      )
    }
  }

  const row = await prisma.project.update({
    where: { id },
    data: {
      parentId,
      position: input.position ?? (await nextPosition(userId, parentId)),
    },
    select: selection,
  })

  return toRecord(row)
}

/**
 * `candidate` está abaixo de `ancestor` na árvore?
 *
 * Sobe pela cadeia de pais em vez de descer pelos filhos: uma subárvore pode ser larga,
 * mas a cadeia até a raiz é curta. O `visited` é rede de segurança — se um ciclo
 * escapasse para o banco, sem ele isto giraria para sempre.
 */
async function isDescendant(userId: string, candidate: string, ancestor: string): Promise<boolean> {
  const visited = new Set<string>()
  let cursor: string | null = candidate

  while (cursor && !visited.has(cursor)) {
    visited.add(cursor)

    const row: { parentId: string | null } | null = await prisma.project.findFirst({
      where: { id: cursor, userId },
      select: { parentId: true },
    })

    if (!row?.parentId) return false
    if (row.parentId === ancestor) return true

    cursor = row.parentId
  }

  return false
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
