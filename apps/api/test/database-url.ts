/**
 * Deriva a URL do banco de teste a partir da de desenvolvimento.
 *
 * Fica em arquivo próprio porque `vitest.config.ts` e `global-setup.ts` rodam em
 * processos diferentes: o `test.env` da config só chega nos workers, não no global
 * setup. Se cada um calculasse a URL por conta própria, o setup migraria um banco e
 * os testes leriam outro — foi exatamente o que aconteceu antes.
 */
export function testDatabaseUrl(): string {
  const base = process.env.DATABASE_URL

  if (!base) {
    throw new Error('DATABASE_URL não definida — copie apps/api/.env.example para .env')
  }

  const url = new URL(base)

  if (url.pathname === '/pauta_test') {
    return url.toString()
  }

  url.pathname = '/pauta_test'
  return url.toString()
}
