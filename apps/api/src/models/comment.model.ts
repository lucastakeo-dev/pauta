import type { CreateCommentInput, UpdateCommentInput } from '@pauta/contracts'
import { prisma } from '../config/prisma.js'
import { NotFoundError } from '../lib/errors.js'
import { resolveExistingId, resolveWritableId } from './task.model.js'

/**
 * Comentários de uma tarefa.
 *
 * Model separado do de tarefas porque é outra entidade, com ciclo de vida próprio: o
 * comentário nasce, é editado e some sem que a tarefa mude. O que os dois compartilham
 * é só a checagem de dono, e ela vem de `resolveWritableId`.
 */

const selection = {
  id: true,
  taskId: true,
  body: true,
  createdAt: true,
  editedAt: true,
  user: { select: { id: true, name: true } },
} as const

export type CommentRecord = {
  id: string
  taskId: string
  body: string
  author: { id: string; name: string }
  createdAt: Date
  editedAt: Date | null
}

type Row = {
  id: string
  taskId: string
  body: string
  createdAt: Date
  editedAt: Date | null
  user: { id: string; name: string }
}

function toRecord(row: Row): CommentRecord {
  return {
    id: row.id,
    taskId: row.taskId,
    body: row.body,
    author: row.user,
    createdAt: row.createdAt,
    editedAt: row.editedAt,
  }
}

/**
 * A conversa inteira, do mais antigo para o mais novo.
 *
 * Sem paginação de propósito: são os comentários de uma tarefa só, e ler de baixo para
 * cima quebraria a leitura de um histórico curto. Se um dia houver tarefa com centenas,
 * o índice `(task_id, created_at)` já está lá para paginar por cursor.
 */
export async function list(userId: string, taskId: string): Promise<CommentRecord[]> {
  const targetId = await resolveExistingId(userId, taskId)

  // Ocorrência ainda não materializada: a tarefa existe como cálculo, e uma linha que
  // não existe não tem comentário. Lista vazia, sem criar nada para descobrir isso.
  if (!targetId) return []

  const rows = await prisma.taskComment.findMany({
    where: { taskId: targetId, userId },
    orderBy: { createdAt: 'asc' },
    select: selection,
  })

  return rows.map(toRecord)
}

export async function create(
  userId: string,
  taskId: string,
  input: CreateCommentInput,
): Promise<CommentRecord> {
  const targetId = await resolveWritableId(userId, taskId)

  const row = await prisma.taskComment.create({
    data: { taskId: targetId, userId, body: input.body },
    select: selection,
  })

  return toRecord(row)
}

export async function update(
  userId: string,
  taskId: string,
  id: string,
  input: UpdateCommentInput,
): Promise<CommentRecord> {
  await requireRow(userId, taskId, id)

  const row = await prisma.taskComment.update({
    where: { id },
    data: { body: input.body, editedAt: new Date() },
    select: selection,
  })

  return toRecord(row)
}

export async function remove(userId: string, taskId: string, id: string): Promise<void> {
  await requireRow(userId, taskId, id)
  await prisma.taskComment.delete({ where: { id } })
}

/**
 * Confere que o comentário existe, é seu e é mesmo desta tarefa.
 *
 * A terceira parte importa: sem ela, o id de um comentário de outra tarefa editaria
 * daqui, e a URL passaria a mentir sobre o que está sendo alterado.
 */
async function requireRow(userId: string, taskId: string, id: string): Promise<void> {
  const targetId = await resolveExistingId(userId, taskId)

  const row = targetId
    ? await prisma.taskComment.findFirst({
        where: { id, userId, taskId: targetId },
        select: { id: true },
      })
    : null

  if (!row) {
    throw new NotFoundError('Comentário')
  }
}
