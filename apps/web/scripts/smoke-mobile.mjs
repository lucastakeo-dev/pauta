/**
 * Fumaça da tela estreita, num navegador de verdade a 390×844.
 *
 * O que se prova aqui não é o layout em si — é que a barra deixa de comer a tela e que
 * nada vaza pela direita. Foram os dois sintomas do app abaixo de 768px: a lista de
 * tarefas cabia em 50px, e o resto era cortado sem rolagem nenhuma.
 *
 * Uso: node scripts/smoke-mobile.mjs [diretorio-de-saida]
 * Requer web em :5176 e API em :3334.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const API = 'http://localhost:3334'
const WEB = 'http://localhost:5176'
const outDir = process.argv[2] ?? 'smoke-mobile-out'
const results = []

function check(name, passed, detail = '') {
  results.push({ name, passed })
  console.log(`${passed ? 'OK  ' : 'FALHA'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
})
page.on('pageerror', (e) => consoleErrors.push(String(e)))

mkdirSync(outDir, { recursive: true })

try {
  const email = `mobile-${Date.now()}@exemplo.dev`
  const registro = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Takeo', email, password: 'senha-bem-segura' }),
  }).then((r) => r.json())

  const auth = { authorization: `Bearer ${registro.token}`, 'content-type': 'application/json' }
  const post = (rota, body) =>
    fetch(`${API}${rota}`, { method: 'POST', headers: auth, body: JSON.stringify(body) }).then(
      (r) => r.json(),
    )

  const hora = (h, m = 0) => {
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }

  const casa = await post('/projects', { name: 'Casa', icon: 'house', color: '#4FB477' })
  const urgente = await post('/labels', { name: 'urgente', color: '#E5484D' })
  await post('/tasks', {
    title: 'Pagar condomínio do apartamento novo',
    projectId: casa.id,
    priority: 1,
    dueAt: hora(12),
    labelIds: [urgente.id],
    status: 'todo',
  })
  await post('/tasks', {
    title: '1:1 com a Ana',
    scheduledStart: hora(11),
    scheduledEnd: hora(11, 30),
    status: 'todo',
  })

  await page.goto(`${WEB}/signin`, { waitUntil: 'networkidle' })
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((u) => u.pathname === '/today', { timeout: 10_000 })

  /** Quem cruza a borda direita da janela. Vazio é o resultado esperado. */
  const vazando = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && r.right > window.innerWidth + 1
        })
        .slice(0, 3)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`),
    )

  // 1. A tela é do conteúdo: a barra saiu do fluxo e virou gaveta.
  const larguraDoConteudo = async () =>
    (await page.locator('main').first().boundingBox())?.width ?? 0

  const largura = await larguraDoConteudo()
  check('o conteúdo ocupa a tela, não uma fresta', largura > 340, `${Math.round(largura)}px de 390`)

  const barra = page.getByRole('complementary', { name: 'Barra lateral' })
  check(
    'a barra começa fora da tela',
    (await barra.boundingBox()).x < 0,
    `x = ${Math.round((await barra.boundingBox()).x)}`,
  )

  // Fechada, ela também sai do teclado — invisível e focável seria o pior dos mundos.
  check(
    'a barra fechada sai da ordem do Tab',
    await barra.evaluate((el) => el.hasAttribute('inert')),
  )
  await page.screenshot({ path: `${outDir}/01-hoje.png` })

  // 2. Nenhuma tela vaza pela direita.
  for (const [rota, nome] of [
    ['/today', 'Hoje'],
    ['/inbox', 'Inbox'],
    ['/projects', 'Projetos'],
    ['/notes', 'Notas'],
  ]) {
    await page.goto(`${WEB}${rota}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const fora = await vazando()
    check(`${nome} cabe na largura da tela`, fora.length === 0, fora.join(', '))
  }
  await page.screenshot({ path: `${outDir}/02-notas.png` })

  // 3. A gaveta: abre no botão, fecha no Esc, fecha ao navegar.
  await page.goto(`${WEB}/today`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Abrir o menu' }).click()
  await page.waitForTimeout(400)
  check('o botão abre a gaveta', (await barra.boundingBox()).x >= 0)
  check(
    'aberta, a gaveta volta para o teclado',
    await barra.evaluate((el) => !el.hasAttribute('inert')),
  )
  await page.screenshot({ path: `${outDir}/03-gaveta.png` })

  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  check('Esc fecha a gaveta', (await barra.boundingBox()).x < 0)

  // Navegar de dentro dela fecha sozinho: senão a gaveta ficaria por cima da tela que
  // ela mesma acabou de abrir.
  await page.getByRole('button', { name: 'Abrir o menu' }).click()
  await page.waitForTimeout(400)
  await barra.getByRole('link', { name: 'Projetos' }).click()
  await page.waitForURL((u) => u.pathname.startsWith('/projects'), { timeout: 10_000 })
  await page.waitForTimeout(500)
  check('navegar pela gaveta fecha a gaveta', (await barra.boundingBox()).x < 0)

  // 4. A grade do planner também cabe — é a tela mais larga do app.
  await page.goto(`${WEB}/today`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Abrir o menu' }).click()
  await page.waitForTimeout(400)
  await barra.getByRole('button', { name: 'Só o calendário' }).click()
  await page.waitForTimeout(700)

  // Escolher uma tela não muda a rota, então a gaveta precisa fechar por conta própria
  // — senão ela cobre justamente a grade que acabou de ser pedida.
  check('escolher uma tela na gaveta também a fecha', (await barra.boundingBox()).x < 0)

  const grade = page.locator('[data-planner-grid]').first()
  await grade.waitFor({ timeout: 10_000 })
  const foraDaGrade = await vazando()
  check('a grade do dia cabe na tela', foraDaGrade.length === 0, foraDaGrade.join(', '))
  check('o bloco agendado aparece', await grade.getByText('1:1 com a Ana').isVisible())
  await page.screenshot({ path: `${outDir}/04-calendario.png` })

  check('sem erros no console', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
