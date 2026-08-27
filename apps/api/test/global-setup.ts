import { execFileSync } from 'node:child_process'
import 'dotenv/config'
import { Client } from 'pg'
import { testDatabaseUrl } from './database-url.js'

/**
 * Roda uma vez antes de toda a suíte: garante que `pauta_test` existe e está com o
 * schema em dia. Usa `migrate deploy` (e não `db push`) de propósito — assim os testes
 * exercitam exatamente o SQL das migrations, incluindo as constraints escritas à mão.
 */
export async function setup(): Promise<void> {
  const testUrl = testDatabaseUrl()
  const databaseName = new URL(testUrl).pathname.slice(1)

  // Conecta no banco administrativo para poder criar o de teste.
  const adminUrl = new URL(testUrl)
  adminUrl.pathname = '/postgres'

  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()

  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      databaseName,
    ])

    if (rowCount === 0) {
      // Identificador não aceita parâmetro em DDL; o nome vem da nossa própria config,
      // não de entrada externa.
      await admin.query(`CREATE DATABASE "${databaseName}"`)
    }
  } finally {
    await admin.end()
  }

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testUrl, DIRECT_DATABASE_URL: testUrl },
  })
}
