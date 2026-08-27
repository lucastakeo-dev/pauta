import type { CreateTaskInput, ListTasksQuery, TaskStatus, UpdateTaskInput } from '@pauta/contracts'
import { prisma } from '../config/prisma.js'
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js'
import {
  describeRecurrence,
  occurrenceKey,
  occurrencesBetween,
  parseRecurrence,
  parseVirtualTaskId,
  shiftToDay,
  startOfDay,
  virtualTaskId,
} from '../lib/recurrence.js'
import * as labelModel from './label.model.js'
import * as projectModel from './project.model.js'

/**
 * Model de tarefa. É o coração do app, e concentra quatro responsabilidades:
 * validar vínculos (projeto, etiqueta, subtarefa), aplicar as regras de conclusão,
 * expandir recorrências na leitura e materializar a ocorrência quando ela é editada.
 *
 * Nada de Prisma sai daqui: `TaskRecord` é o contrato de saída para controller e view.
 */
export type TaskRecord = {
  id: string
  title: string
  notes: string | null
  status: TaskStatus
  priority: number
  dueAt: Date | null
  scheduledStart: Date | null
  scheduledEnd: Date | null
  estimateMin: number | null
  completedAt: Date | null
  projectId: string | null
  project: { id: string; name: string; color: string } | null
  parentId: string | null
  labels: Array<{ id: string; name: string; color: string }>
  subtaskCount: number
  completedSubtaskCount: number
  recurrence: { id: string; rrule: string; summary: string } | null
  occurrenceOn: string | null
  isVirtual: boolean
  position: number
  createdAt: Date
  updatedAt: Date
}

const selection = {
  id: true,
  title: true,
  notes: true,
  status: true,
  priority: true,
  dueAt: true,
  scheduledStart: true,
  scheduledEnd: true,
  estimateMin: true,
  completedAt: true,
  projectId: true,
  parentId: true,
  occurrenceOn: true,
  position: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, name: true, color: true } },
  labels: { select: { label: { select: { id: true, name: true, color: true } } } },
  recurrence: { select: { id: true, rrule: true, anchorAt: true } },
  // Os dois contadores de subtarefa vêm do mesmo `select`: o Prisma não aceita dois
  // `_count` da mesma relação com filtros diferentes, e a profundidade é 1, então a
  // lista é curta.
  subtasks: { select: { status: true } },
} as const

type Row = {
  id: string
  title: string
  notes: string | null
  status: TaskStatus
  priority: number
  dueAt: Date | null
  scheduledStart: Date | null
  scheduledEnd: Date | null
  estimateMin: number | null
  completedAt: Date | null
  projectId: string | null
  parentId: string | null
  occurrenceOn: Date | null
  position: number
  createdAt: Date
  updatedAt: Date
  project: { id: string; name: string; color: string } | null
  labels: Array<{ label: { id: string; name: string; color: string } }>
  recurrence: { id: string; rrule: string; anchorAt: Date } | null
  subtasks: Array<{ status: TaskStatus }>
}

function toRecord(row: Row): TaskRecord {
  const { labels, subtasks, recurrence, occurrenceOn, ...rest } = row

  return {
    ...rest,
    labels: labels.map((entry) => entry.label),
    subtaskCount: subtasks.length,
    completedSubtaskCount: subtasks.filter((subtask) => subtask.status === 'done').length,
    recurrence: recurrence
      ? {
          id: recurrence.id,
          rrule: recurrence.rrule,
          summary: describeRecurrence(recurrence.rrule, recurrence.anchorAt),
        }
      : null,
    occurrenceOn: occurrenceOn ? occurrenceKey(occurrenceOn) : null,
    isVirtual: false,
  }
}

const OPEN_STATUSES: TaskStatus[] = ['inbox', 'todo', 'doing']

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export async function list(userId: string, query: ListTasksQuery): Promise<TaskRecord[]> {
  const hasWindow = query.scheduledFrom !== undefined && query.scheduledTo !== undefined

  const where = {
    userId,
    ...(query.status ? { status: { in: query.status } } : {}),
    ...(query.includeDone || query.status ? {} : { status: { in: OPEN_STATUSES } }),
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.labelId ? { labels: { some: { labelId: query.labelId } } } : {}),
    ...(query.parentId ? { parentId: query.parentId } : query.rootOnly ? { parentId: null } : {}),
    ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}),
    ...(query.dueBefore ? { dueAt: { lte: new Date(query.dueBefore) } } : {}),
    ...(hasWindow
      ? {
          scheduledStart: {
            gte: new Date(query.scheduledFrom as string),
            lte: new Date(query.scheduledTo as string),
          },
        }
      : {}),
    // Numa janela, quem aparece são as ocorrências — o molde da recorrência fica de fora
    // para a mesma tarefa não surgir duas vezes no planner.
    ...(hasWindow
      ? { NOT: { AND: [{ recurrenceId: { not: null } }, { occurrenceOn: null }] } }
      : {}),
  }

  const rows = await prisma.task.findMany({
    where,
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    take: query.limit,
    select: selection,
  })

  const materialized = rows.map(toRecord)

  if (!hasWindow) {
    return materialized
  }

  const virtuals = await expandRecurrences(
    userId,
    new Date(query.scheduledFrom as string),
    new Date(query.scheduledTo as string),
  )

  return [...materialized, ...virtuals].sort(
    (a, b) =>
      (a.scheduledStart?.getTime() ?? Number.POSITIVE_INFINITY) -
      (b.scheduledStart?.getTime() ?? Number.POSITIVE_INFINITY),
  )
}

/**
 * Gera as ocorrências que ainda não existem como linha.
 *
 * Datas já materializadas são puladas: a linha real é a verdade, porque ela carrega
 * as edições que a pessoa fez naquela ocorrência específica.
 *
 * O conjunto de "já materializadas" é buscado à parte, **sem** os filtros da listagem.
 * Se ele viesse da lista já filtrada, concluir uma ocorrência a tiraria do resultado
 * (o padrão esconde concluídas), o expansor não a reconheceria e a recriaria como
 * virtual — a tarefa concluída reapareceria em aberto.
 */
async function expandRecurrences(userId: string, from: Date, to: Date): Promise<TaskRecord[]> {
  const templates = await prisma.task.findMany({
    where: { userId, recurrenceId: { not: null }, occurrenceOn: null },
    select: selection,
  })

  if (templates.length === 0) return []

  const existingRows = await prisma.task.findMany({
    where: {
      userId,
      recurrenceId: { not: null },
      occurrenceOn: { gte: startOfDay(from), lte: to },
    },
    select: { recurrenceId: true, occurrenceOn: true },
  })

  const alreadyMaterialized = new Set(
    existingRows
      .filter((row) => row.occurrenceOn !== null)
      .map((row) => `${row.recurrenceId}:${occurrenceKey(row.occurrenceOn as Date)}`),
  )

  const virtuals: TaskRecord[] = []

  for (const template of templates) {
    if (!template.recurrence) continue

    const dates = occurrencesBetween(
      template.recurrence.rrule,
      template.recurrence.anchorAt,
      from,
      to,
    )

    for (const date of dates) {
      const key = occurrenceKey(date)

      if (alreadyMaterialized.has(`${template.recurrence.id}:${key}`)) continue

      virtuals.push(buildVirtual(toRecord(template), date))
    }
  }

  return virtuals
}

/** Molda a ocorrência a partir do template, movendo as datas para o dia certo. */
function buildVirtual(template: TaskRecord, date: Date): TaskRecord {
  return {
    ...template,
    id: virtualTaskId(template.id, date),
    dueAt: template.dueAt ? shiftToDay(template.dueAt, date) : null,
    scheduledStart: template.scheduledStart ? shiftToDay(template.scheduledStart, date) : null,
    scheduledEnd: template.scheduledEnd ? shiftToDay(template.scheduledEnd, date) : null,
    // A ocorrência ainda não foi tocada: nasce em aberto, mesmo que o molde esteja concluído.
    status: template.status === 'done' ? 'todo' : template.status,
    completedAt: null,
    occurrenceOn: occurrenceKey(date),
    isVirtual: true,
    subtaskCount: 0,
    completedSubtaskCount: 0,
  }
}

export async function findById(userId: string, id: string): Promise<TaskRecord> {
  const virtual = parseVirtualTaskId(id)

  if (virtual) {
    const template = await requireRow(userId, virtual.templateId)

    if (!template.recurrence) {
      throw new NotFoundError('Tarefa')
    }

    assertValidOccurrence(template.recurrence, virtual.occurrenceOn)

    return buildVirtual(toRecord(template), new Date(`${virtual.occurrenceOn}T00:00:00.000Z`))
  }

  return toRecord(await requireRow(userId, id))
}

async function requireRow(userId: string, id: string): Promise<Row> {
  const row = await prisma.task.findFirst({ where: { id, userId }, select: selection })

  if (!row) {
    throw new NotFoundError('Tarefa')
  }

  return row
}

/**
 * Confere que a data pedida é mesmo uma ocorrência da regra.
 *
 * Sem isto, um id virtual montado à mão criaria uma tarefa em qualquer data,
 * driblando a recorrência.
 */
function assertValidOccurrence(
  recurrence: { rrule: string; anchorAt: Date },
  occurrenceOn: string,
): Date {
  const day = new Date(`${occurrenceOn}T00:00:00.000Z`)
  const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000 - 1)
  const [match] = occurrencesBetween(recurrence.rrule, recurrence.anchorAt, day, nextDay)

  if (!match) {
    throw new NotFoundError('Ocorrência')
  }

  return match
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

export async function create(userId: string, input: CreateTaskInput): Promise<TaskRecord> {
  await assertLinksOwned(userId, input.projectId, input.labelIds, input.parentId)

  const recurrenceId = input.recurrence
    ? await createRecurrence(userId, input.recurrence, input)
    : null

  const last = await prisma.task.findFirst({
    where: { userId, parentId: input.parentId ?? null },
    orderBy: { position: 'desc' },
    select: { position: true },
  })

  const row = await prisma.task.create({
    data: {
      userId,
      title: input.title,
      notes: input.notes ?? null,
      status: input.status,
      priority: input.priority,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      scheduledStart: input.scheduledStart ? new Date(input.scheduledStart) : null,
      scheduledEnd: input.scheduledEnd ? new Date(input.scheduledEnd) : null,
      estimateMin: input.estimateMin ?? null,
      projectId: input.projectId ?? null,
      parentId: input.parentId ?? null,
      recurrenceId,
      position: (last?.position ?? -1) + 1,
      ...(input.status === 'done' ? { completedAt: new Date() } : {}),
      ...(input.labelIds.length > 0
        ? { labels: { create: input.labelIds.map((labelId) => ({ labelId })) } }
        : {}),
    },
    select: selection,
  })

  return toRecord(row)
}

async function createRecurrence(
  userId: string,
  recurrence: { rrule: string; anchorAt?: string | undefined },
  input: { scheduledStart?: string | null | undefined; dueAt?: string | null | undefined },
): Promise<string> {
  const anchorAt = recurrence.anchorAt
    ? new Date(recurrence.anchorAt)
    : input.scheduledStart
      ? new Date(input.scheduledStart)
      : input.dueAt
        ? new Date(input.dueAt)
        : new Date()

  // Valida de verdade antes de gravar: o schema Zod só confere o formato.
  parseRecurrence(recurrence.rrule, anchorAt)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  })

  const created = await prisma.recurrence.create({
    data: {
      userId,
      rrule: recurrence.rrule.trim(),
      timezone: user?.timezone ?? 'America/Sao_Paulo',
      anchorAt,
    },
    select: { id: true },
  })

  return created.id
}

export async function update(
  userId: string,
  id: string,
  input: UpdateTaskInput,
): Promise<TaskRecord> {
  const virtual = parseVirtualTaskId(id)
  const targetId = virtual ? await materializeOccurrence(userId, virtual) : id

  if (!virtual) {
    await requireRow(userId, targetId)
  }

  await assertLinksOwned(userId, input.projectId, input.labelIds, input.parentId, targetId)

  const row = await prisma.task.update({
    where: { id: targetId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueAt !== undefined ? { dueAt: input.dueAt ? new Date(input.dueAt) : null } : {}),
      ...(input.scheduledStart !== undefined
        ? { scheduledStart: input.scheduledStart ? new Date(input.scheduledStart) : null }
        : {}),
      ...(input.scheduledEnd !== undefined
        ? { scheduledEnd: input.scheduledEnd ? new Date(input.scheduledEnd) : null }
        : {}),
      ...(input.estimateMin !== undefined ? { estimateMin: input.estimateMin ?? null } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId ?? null } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId ?? null } : {}),
      // Mudar de/para "done" arrasta o carimbo de conclusão junto — são a mesma coisa
      // vista de dois ângulos, e deixar desalinhar quebraria os relatórios depois.
      ...(input.status !== undefined
        ? {
            status: input.status,
            completedAt: input.status === 'done' ? new Date() : null,
          }
        : {}),
      ...(input.labelIds !== undefined
        ? {
            labels: {
              deleteMany: {},
              create: input.labelIds.map((labelId) => ({ labelId })),
            },
          }
        : {}),
    },
    select: selection,
  })

  return toRecord(row)
}

/** Concluir e reabrir: a ação mais frequente do app, por isso tem caminho próprio. */
export async function toggle(userId: string, id: string, done: boolean): Promise<TaskRecord> {
  const virtual = parseVirtualTaskId(id)
  const targetId = virtual ? await materializeOccurrence(userId, virtual) : id

  if (!virtual) {
    await requireRow(userId, targetId)
  }

  const row = await prisma.task.update({
    where: { id: targetId },
    data: {
      status: done ? 'done' : 'todo',
      completedAt: done ? new Date() : null,
    },
    select: selection,
  })

  return toRecord(row)
}

/**
 * Transforma uma ocorrência gerada em linha de verdade.
 *
 * Acontece na primeira vez que a pessoa mexe nela — concluir, reagendar, editar.
 * Até então ela só existia como resultado de um cálculo.
 */
async function materializeOccurrence(
  userId: string,
  virtual: { templateId: string; occurrenceOn: string },
): Promise<string> {
  const template = await requireRow(userId, virtual.templateId)

  if (!template.recurrence) {
    throw new NotFoundError('Tarefa')
  }

  const date = assertValidOccurrence(template.recurrence, virtual.occurrenceOn)
  const occurrenceOn = new Date(`${virtual.occurrenceOn}T00:00:00.000Z`)

  const existing = await prisma.task.findFirst({
    where: { recurrenceId: template.recurrence.id, occurrenceOn },
    select: { id: true },
  })

  if (existing) return existing.id

  try {
    const created = await prisma.task.create({
      data: {
        userId,
        title: template.title,
        notes: template.notes,
        status: template.status === 'done' ? 'todo' : template.status,
        priority: template.priority,
        dueAt: template.dueAt ? shiftToDay(template.dueAt, date) : null,
        scheduledStart: template.scheduledStart ? shiftToDay(template.scheduledStart, date) : null,
        scheduledEnd: template.scheduledEnd ? shiftToDay(template.scheduledEnd, date) : null,
        estimateMin: template.estimateMin,
        projectId: template.projectId,
        recurrenceId: template.recurrence.id,
        occurrenceOn,
        position: template.position,
        ...(template.labels.length > 0
          ? { labels: { create: template.labels.map((entry) => ({ labelId: entry.label.id })) } }
          : {}),
      },
      select: { id: true },
    })

    return created.id
  } catch {
    // Corrida entre duas abas materializando a mesma ocorrência: o UNIQUE
    // (recurrence_id, occurrence_on) barrou a segunda, então basta ler a vencedora.
    const winner = await prisma.task.findFirst({
      where: { recurrenceId: template.recurrence.id, occurrenceOn },
      select: { id: true },
    })

    if (!winner)
      throw new ConflictError('occurrence_conflict', 'Não foi possível abrir a ocorrência.')

    return winner.id
  }
}

export async function remove(userId: string, id: string): Promise<void> {
  const virtual = parseVirtualTaskId(id)

  if (virtual) {
    // Apagar uma ocorrência que ainda não existe não tem o que apagar. Excluir uma
    // data específica de uma recorrência é EXDATE, que fica para quando houver uso real.
    throw new ValidationError('Para remover esta repetição, edite ou apague a tarefa que a gera.')
  }

  await requireRow(userId, id)
  await prisma.task.delete({ where: { id } })
}

export async function reorder(userId: string, ids: string[]): Promise<void> {
  const owned = await prisma.task.count({ where: { userId, id: { in: ids } } })

  if (owned !== ids.length) {
    throw new NotFoundError('Tarefa')
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.task.update({ where: { id }, data: { position: index } })),
  )
}

// ---------------------------------------------------------------------------
// Regras de vínculo
// ---------------------------------------------------------------------------

async function assertLinksOwned(
  userId: string,
  projectId: string | null | undefined,
  labelIds: string[] | undefined,
  parentId: string | null | undefined,
  selfId?: string,
): Promise<void> {
  if (projectId) {
    await projectModel.assertOwned(userId, projectId)
  }

  if (labelIds && labelIds.length > 0) {
    await labelModel.assertAllOwned(userId, labelIds)
  }

  if (!parentId) return

  if (selfId && parentId === selfId) {
    throw new ValidationError('Uma tarefa não pode ser subtarefa dela mesma.')
  }

  const parent = await prisma.task.findFirst({
    where: { id: parentId, userId },
    select: { id: true, parentId: true },
  })

  if (!parent) {
    throw new NotFoundError('Tarefa')
  }

  // Um nível de aninhamento. Além disso a lista vira árvore e a tela de "hoje" perde
  // a leitura rápida, que é a razão de ela existir.
  if (parent.parentId) {
    throw new ValidationError('Subtarefa não pode ter subtarefa.')
  }
}
