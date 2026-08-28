import type { CreateNoteInput, ListNotesQuery, UpdateNoteInput } from '@pauta/contracts'
import { prisma } from '../config/prisma.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { extractLinkedTitles, normalizeTitle } from '../lib/note-links.js'

/** Cliente de dentro de uma transação — mesma API do Prisma, sem os métodos de topo. */
type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>

/**
 * Model de nota.
 *
 * A parte interessante é o `[[link]]`: ao salvar, o texto é varrido, os títulos citados
 * viram (ou encontram) notas, e a tabela `note_links` é reescrita inteira para esta
 * origem. Tabela derivada — a verdade é o conteúdo.
 */
export type NoteRecord = {
  id: string
  title: string
  contentJson: unknown
  dailyOn: Date | null
  createdAt: Date
  updatedAt: Date
  linksTo: Array<{ id: string; title: string; dailyOn: Date | null }>
  linkedFrom: Array<{ id: string; title: string; dailyOn: Date | null }>
}

export type NoteRefRecord = { id: string; title: string; dailyOn: Date | null }

const refSelect = { id: true, title: true, dailyOn: true }

const selection = {
  id: true,
  title: true,
  contentJson: true,
  dailyOn: true,
  createdAt: true,
  updatedAt: true,
  linksFrom: { select: { target: { select: refSelect } } },
  linksTo: { select: { source: { select: refSelect } } },
}

type Row = {
  id: string
  title: string
  contentJson: unknown
  dailyOn: Date | null
  createdAt: Date
  updatedAt: Date
  linksFrom: Array<{ target: NoteRefRecord }>
  linksTo: Array<{ source: NoteRefRecord }>
}

function toRecord(row: Row): NoteRecord {
  const { linksFrom, linksTo, ...rest } = row

  return {
    ...rest,
    // `linksFrom` no schema é "links que partem daqui"; para quem lê a nota, são as
    // notas citadas. `linksTo` são as que citam esta — os backlinks.
    linksTo: linksFrom.map((link) => link.target),
    linkedFrom: linksTo.map((link) => link.source),
  }
}

/** Título vazio depois de normalizar não serve de chave. */
function keyFor(title: string): string {
  const key = normalizeTitle(title)

  if (!key) {
    throw new ConflictError('invalid_title', 'Esse título não pode ser usado.')
  }

  return key
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export async function list(userId: string, query: ListNotesQuery): Promise<NoteRefRecord[]> {
  return prisma.note.findMany({
    where: {
      userId,
      ...(query.excludeDaily ? { dailyOn: null } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: query.limit,
    select: refSelect,
  })
}

export async function findById(userId: string, id: string): Promise<NoteRecord> {
  const row = await prisma.note.findFirst({ where: { id, userId }, select: selection })

  if (!row) {
    throw new NotFoundError('Nota')
  }

  return toRecord(row as Row)
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

export async function create(userId: string, input: CreateNoteInput): Promise<NoteRecord> {
  const titleKey = keyFor(input.title)

  const existing = await prisma.note.findFirst({
    where: { userId, titleKey },
    select: { id: true },
  })

  if (existing) {
    throw new ConflictError('note_title_taken', 'Já existe uma nota com esse título.')
  }

  const created = await prisma.note.create({
    data: {
      userId,
      title: input.title,
      titleKey,
      contentJson: (input.contentJson ?? {}) as object,
    },
    select: { id: true },
  })

  await prisma.$transaction((tx) => syncLinks(tx, userId, created.id, input.contentJson ?? {}))

  return findById(userId, created.id)
}

export async function update(
  userId: string,
  id: string,
  input: UpdateNoteInput,
): Promise<NoteRecord> {
  await findById(userId, id)

  if (input.title !== undefined) {
    const titleKey = keyFor(input.title)
    const clash = await prisma.note.findFirst({
      where: { userId, titleKey, id: { not: id } },
      select: { id: true },
    })

    if (clash) {
      throw new ConflictError('note_title_taken', 'Já existe uma nota com esse título.')
    }

    await prisma.note.update({ where: { id }, data: { title: input.title, titleKey } })
  }

  if (input.contentJson !== undefined) {
    // Conteúdo e links numa transação só.
    //
    // Em duas operações separadas, dois salvamentos concorrentes podiam se cruzar: o
    // segundo gravava o texto completo e criava o link, e o primeiro, chegando atrasado
    // com o texto parcial, apagava o link recém-criado. A nota ficava com o conteúdo
    // certo e sem backlink nenhum — inconsistência silenciosa.
    await prisma.$transaction(async (tx) => {
      await tx.note.update({
        where: { id },
        data: { contentJson: input.contentJson as object },
      })

      await syncLinks(tx, userId, id, input.contentJson)
    })
  }

  return findById(userId, id)
}

export async function remove(userId: string, id: string): Promise<void> {
  await findById(userId, id)
  await prisma.note.delete({ where: { id } })
}

/**
 * Abre a nota do dia, criando na primeira visita.
 *
 * O `UNIQUE` parcial `notes_user_daily_unique` garante uma por dia mesmo se duas abas
 * pedirem ao mesmo tempo — por isso a corrida é tratada relendo, não travando.
 */
export async function findOrCreateDaily(userId: string, date: string): Promise<NoteRecord> {
  const dailyOn = new Date(`${date}T00:00:00.000Z`)

  const existing = await prisma.note.findFirst({
    where: { userId, dailyOn },
    select: { id: true },
  })

  if (existing) {
    return findById(userId, existing.id)
  }

  // Título legível e estável, que também serve de alvo para `[[28/08/2026]]`.
  const title = dailyOn.toISOString().slice(0, 10).split('-').reverse().join('/')

  try {
    const created = await prisma.note.create({
      data: { userId, title, titleKey: normalizeTitle(title), dailyOn, contentJson: {} },
      select: { id: true },
    })

    return findById(userId, created.id)
  } catch {
    const winner = await prisma.note.findFirst({
      where: { userId, dailyOn },
      select: { id: true },
    })

    if (!winner) {
      throw new ConflictError('daily_note_conflict', 'Não foi possível abrir a nota do dia.')
    }

    return findById(userId, winner.id)
  }
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/**
 * Reescreve os links que partem desta nota.
 *
 * Nota citada que ainda não existe é **criada vazia** — é o que dá sentido ao
 * `[[link]]`: escrever primeiro, preencher depois. O UNIQUE do `title_key` garante que
 * citar "[[casa]]" e "[[Casa]]" aponte para a mesma página.
 */
async function syncLinks(
  tx: TransactionClient,
  userId: string,
  sourceId: string,
  content: unknown,
): Promise<void> {
  const titles = extractLinkedTitles(content)

  await tx.noteLink.deleteMany({ where: { sourceId } })

  if (titles.length === 0) return

  const keys = titles.map(normalizeTitle)
  const found = await tx.note.findMany({
    where: { userId, titleKey: { in: keys } },
    select: { id: true, titleKey: true },
  })

  const byKey = new Map<string, string>(found.map((note) => [note.titleKey, note.id]))

  const targetIds: string[] = []

  for (const [index, title] of titles.entries()) {
    const key = keys[index]
    if (!key) continue

    let targetId = byKey.get(key)

    if (!targetId) {
      const created = await tx.note.create({
        data: { userId, title, titleKey: key, contentJson: {} },
        select: { id: true },
      })

      targetId = created.id
      byKey.set(key, targetId)
    }

    // Uma nota não linka para si mesma — o banco também recusa
    // (`note_links_not_self_check`).
    if (targetId !== sourceId) targetIds.push(targetId)
  }

  if (targetIds.length === 0) return

  await tx.noteLink.createMany({
    data: targetIds.map((targetId) => ({ sourceId, targetId })),
    skipDuplicates: true,
  })
}
