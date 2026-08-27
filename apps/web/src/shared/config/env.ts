import { z } from 'zod'

/**
 * Mesma disciplina do backend: variável de ambiente entra por schema.
 * Erro de configuração aparece no boot, não numa tela em branco.
 */
const envSchema = z.object({
  VITE_API_URL: z.url('VITE_API_URL precisa ser uma URL válida.').default('http://localhost:3334'),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(
    `Configuração do front inválida:\n${parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')}`,
  )
}

export const env = {
  apiUrl: parsed.data.VITE_API_URL.replace(/\/$/, ''),
}
