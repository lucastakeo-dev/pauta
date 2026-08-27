import 'dotenv/config'
import { defineConfig } from 'vitest/config'
import { testDatabaseUrl } from './test/database-url.js'

/**
 * Os testes rodam contra um banco de verdade (`pauta_test`), não contra mock.
 *
 * Em MVC o model conversa direto com o banco, e boa parte das regras deste projeto
 * são constraints do Postgres — testar com o banco fora do circuito daria uma
 * confiança falsa justamente onde a garantia mora.
 */
export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    // Um banco compartilhado: arquivos em paralelo disputariam as mesmas tabelas.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl(),
      JWT_SECRET: 'segredo-exclusivo-de-teste-com-mais-de-32-caracteres',
    },
  },
})
