import { buildApp } from './app.js'
import { env } from './config/env.js'

/**
 * Ponto de entrada do processo. Só sobe o servidor — montar a aplicação é trabalho
 * do `buildApp()`, para que os testes reaproveitem tudo sem abrir porta.
 */
async function main(): Promise<void> {
  const app = await buildApp()

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`recebido ${signal}, encerrando...`)
    await app.close()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  try {
    await app.listen({ port: env.PORT, host: env.HOST })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

void main()
