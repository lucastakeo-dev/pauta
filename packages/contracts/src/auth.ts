import { z } from 'zod'
import { uuidSchema } from './common.js'

/**
 * App pessoal: o registro existe para criar a própria conta e para o app mobile
 * depois entrar com as mesmas credenciais.
 */

/**
 * Normaliza antes de validar. A ordem importa: `z.email().trim()` validaria o texto
 * cru primeiro e recusaria " ana@x.dev " por causa dos espaços, em vez de limpá-lo.
 * Com `.pipe()`, o e-mail chega ao banco sempre em minúsculas e sem espaços — é o que
 * faz a checagem de duplicidade funcionar.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Informe um e-mail válido.'))

export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres.')
  .max(200, 'Senha longa demais.')

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Informe seu nome.').max(120, 'Nome longo demais.'),
  email: emailSchema,
  password: passwordSchema,
  /** IANA time zone. O planner depende disso para desenhar o dia certo. */
  timezone: z.string().min(1).default('America/Sao_Paulo'),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const userViewSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  email: z.string(),
  timezone: z.string(),
  createdAt: z.string(),
})
export type UserView = z.infer<typeof userViewSchema>

export const sessionViewSchema = z.object({
  token: z.string(),
  user: userViewSchema,
})
export type SessionView = z.infer<typeof sessionViewSchema>
