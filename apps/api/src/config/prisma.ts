import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import { env } from './env.js'

/**
 * Cliente único do Prisma. Só `src/models/**` pode importar este arquivo — o Biome
 * barra a importação em controllers, views e rotas (ver `biome.json`).
 *
 * Prisma 7 conecta via driver adapter (`pg`) em vez do engine binário: a URL vem daqui,
 * não do `schema.prisma`.
 *
 * O `globalThis` evita esgotar o pool abrindo um cliente novo a cada reload do tsx watch.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
