// Lê o .env local. Em produção não existe arquivo e o dotenv não faz nada — as
// variáveis reais do ambiente já vencem, então o mesmo código serve nos dois lados.
import 'dotenv/config'
import { z } from 'zod'

/**
 * Toda variável de ambiente entra por este schema. Nada de `process.env` solto pelo
 * código: se faltar variável, o boot falha aqui com mensagem clara em vez de quebrar
 * em runtime numa rota qualquer.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória.'),
  DIRECT_DATABASE_URL: z.string().optional(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa de pelo menos 32 caracteres.'),
  JWT_EXPIRES_IN: z.string().default('30d'),

  PORT: z.coerce.number().int().positive().default(3334),
  HOST: z.string().default('0.0.0.0'),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5176')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')

  throw new Error(`Variáveis de ambiente inválidas:\n${issues}`)
}

export const env = parsed.data
export type Env = typeof env
