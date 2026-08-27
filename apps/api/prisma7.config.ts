import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

/**
 * Configuração do Prisma CLI (migrations, generate, studio).
 *
 * A partir do Prisma 7 a URL de conexão saiu do `schema.prisma` e vive aqui. O runtime
 * da aplicação não usa este arquivo — ele conecta pelo driver adapter em
 * `src/config/prisma.ts`.
 *
 * `directUrl` importa no Supabase: as migrations precisam da conexão direta, porque o
 * pooler em modo transaction não suporta os comandos DDL que o Migrate emite.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
    directUrl: process.env.DIRECT_DATABASE_URL ?? env('DATABASE_URL'),
  },
})
