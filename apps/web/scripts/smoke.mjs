/**
 * Fumaça do fluxo de entrada, com navegador de verdade.
 *
 * Não substitui os testes da API — cobre o que só aparece no browser: se o bundle
 * carrega, se a guarda de rota redireciona, se o formulário fala com a API e se a
 * sessão sobrevive ao reload.
 *
 * Uso: node scripts/smoke.mjs [diretorio-de-saida]
 * Requer web em :5176 e API em :3334.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const WEB = 'http://localhost:5176'
const outDir = process.argv[2] ?? 'smoke-out'
const results = []

function check(name, passed, detail = '') {
  results.push({ name, passed, detail })
  console.log(`${passed ? 'OK  ' : 'FALHA'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
})

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

const consoleErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(String(error)))

// Guardamos a URL de cada resposta com falha: o texto do console diz só "404",
// o que não ajuda a achar o culpado.
const failedRequests = []
page.on('response', (response) => {
  if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`)
})

mkdirSync(outDir, { recursive: true })

try {
  // 1. A raiz é pública: visitante anônimo vê a vitrine, não o login.
  await page.goto(WEB, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /Planejar o dia/ }).waitFor({ timeout: 10_000 })
  check('a raiz mostra a vitrine para quem não entrou', true)

  // 2. Área logada sem sessão manda para o login.
  await page.goto(`${WEB}/hoje`, { waitUntil: 'networkidle' })
  check('/hoje exige login', page.url().includes('/entrar'), page.url())
  await page.screenshot({ path: `${outDir}/01-login.png` })

  // 3. Validação no cliente, antes de qualquer viagem de rede.
  await page.getByLabel('E-mail').fill('nao-e-email')
  await page.getByLabel('Senha').fill('123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  const erroVisivel = await page.getByText('Informe um e-mail válido.').isVisible()
  check('valida e-mail inválido no cliente', erroVisivel)
  await page.screenshot({ path: `${outDir}/02-validacao.png` })

  // 4. Cadastro real, batendo na API.
  const email = `smoke-${Date.now()}@exemplo.dev`
  await page.getByRole('button', { name: /Criar uma/ }).click()
  await page.getByLabel('Nome').fill('Takeo Smoke')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()

  await page.waitForURL((url) => url.pathname === '/hoje', { timeout: 10_000 })
  await page.getByRole('heading', { name: 'Tarefas' }).waitFor({ timeout: 10_000 })
  check('cadastro entra direto no app', true, page.url())
  await page.screenshot({ path: `${outDir}/03-logado.png` })

  // 5. A sessão sobrevive ao reload (token persistido + /auth/me).
  await page.reload({ waitUntil: 'networkidle' })
  const continuaLogado = await page.getByRole('heading', { name: 'Tarefas' }).isVisible()
  check('sessão sobrevive ao reload', continuaLogado, page.url())

  // 6. Sair volta ao login, e a área logada volta a ser barrada.
  await page.getByRole('button', { name: 'Sair' }).click()
  await page.waitForURL((url) => url.pathname.includes('/entrar'), { timeout: 10_000 })

  await page.goto(`${WEB}/hoje`, { waitUntil: 'networkidle' })
  check('após sair, /hoje volta a exigir login', page.url().includes('/entrar'), page.url())

  // 7. Com sessão, a vitrine não faz sentido: a raiz manda para o app.
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/hoje', { timeout: 10_000 })

  await page.goto(WEB, { waitUntil: 'networkidle' })
  await page.waitForURL((url) => url.pathname === '/hoje', { timeout: 10_000 })
  check('quem já tem sessão pula a vitrine', true, page.url())

  await page.screenshot({ path: `${outDir}/04-deslogado.png` })

  check(
    'sem erros no console',
    consoleErrors.length === 0,
    [...consoleErrors.slice(0, 3), ...failedRequests.slice(0, 3)].join(' | '),
  )
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
