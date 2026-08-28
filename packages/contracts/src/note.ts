import { z } from 'zod'
import { isoDateSchema, uuidSchema } from './common.js'

/**
 * Notas: páginas livres e a nota do dia.
 *
 * O conteúdo é o documento do editor em JSON. A API não interpreta o formato — só
 * guarda e extrai os `[[links]]` do texto — para trocar de editor não virar migration.
 */

/** Documento do editor. `unknown` de propósito: o formato é do cliente, não da API. */
export const noteContentSchema = z.record(z.string(), z.unknown())

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, 'Dê um título à nota.').max(300, 'Título longo demais.'),
  contentJson: noteContentSchema.optional(),
})
export type CreateNoteInput = z.infer<typeof createNoteSchema>

export const updateNoteSchema = z
  .object({
    title: z.string().trim().min(1, 'Dê um título à nota.').max(300, 'Título longo demais.'),
    contentJson: noteContentSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Envie ao menos um campo para alterar.',
  })
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>

export const listNotesQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  /** Só as páginas livres, sem as notas diárias. */
  excludeDaily: z.stringbool().default(false),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>

/** Referência enxuta, usada nos backlinks e no autocomplete do `[[`. */
export const noteRefSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  dailyOn: z.string().nullable(),
})
export type NoteRef = z.infer<typeof noteRefSchema>

export const noteViewSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  contentJson: z.unknown(),
  /** Preenchido só na nota do dia. */
  dailyOn: z.string().nullable(),
  /** Notas citadas por esta. */
  linksTo: z.array(noteRefSchema),
  /** Notas que citam esta — os backlinks. */
  linkedFrom: z.array(noteRefSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type NoteView = z.infer<typeof noteViewSchema>

export const noteListSchema = z.array(noteRefSchema)

/** `GET /notes/daily/:date` — abre (ou cria) a nota daquele dia. */
export const dailyNoteParamsSchema = z.object({
  date: isoDateSchema,
})
export type DailyNoteParams = z.infer<typeof dailyNoteParamsSchema>
