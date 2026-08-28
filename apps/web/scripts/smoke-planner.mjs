/**
 * Fumaça da grade do dia, com navegador de verdade.
 *
 * Verifica o que só o browser mostra: bloco posicionado na hora certa, evento e tarefa
 * convivendo na mesma coluna, navegação entre dias e o marcador de "agora".
 *
 * Uso: node scripts/smoke-planner.mjs [diretorio-de-saida]
 * Requer web em :5176 e API em :3334.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const WEB = 'http://localhost:5176'
const API = 'http://localhost:3334'
const HOUR_HEIGHT = 56
const outDir = process.argv[2] ?? 'smoke-out'
const results = []

function check(name, passed, detail = '') {
  results.push({ name, passed })
  console.log(`${passed ? 'OK  ' : 'FALHA'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

/** Instante de hoje na hora cheia informada, em ISO. */
function hojeAs(hour) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
})

const page = await browser.newPage({ viewport: { width: 1600, height: 950 } })

const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
})
page.on('pageerror', (e) => consoleErrors.push(String(e)))

mkdirSync(outDir, { recursive: true })

try {
  // Conta nova e dados semeados pela API: a grade é só leitura nesta wave.
  const email = `planner-${Date.now()}@exemplo.dev`
  const registro = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Takeo', email, password: 'senha-bem-segura' }),
  }).then((r) => r.json())

  const auth = { 'content-type': 'application/json', authorization: `Bearer ${registro.token}` }

  await fetch(`${API}/events`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      title: 'Reunião de time',
      startsAt: hojeAs(9),
      endsAt: hojeAs(10),
    }),
  })

  await fetch(`${API}/tasks`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      title: 'Escrever proposta',
      scheduledStart: hojeAs(14),
      scheduledEnd: hojeAs(16),
    }),
  })

  // Entra com a conta recém-criada.
  await page.goto(`${WEB}/entrar`, { waitUntil: 'networkidle' })
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('/entrar'), { timeout: 10_000 })

  const grade = page.getByRole('region', { name: 'Planner do dia' })
  await grade.waitFor({ timeout: 10_000 })
  check('a grade do dia aparece ao lado da lista', true)

  // 1. Evento e tarefa convivem na mesma coluna.
  const evento = grade.getByText('Reunião de time')
  const tarefa = grade.getByText('Escrever proposta')
  await evento.waitFor({ timeout: 10_000 })
  await tarefa.waitFor({ timeout: 10_000 })
  check('evento e tarefa agendada aparecem juntos na grade', true)

  // 2. Cada bloco cai na altura da sua hora.
  const topoDe = async (locator) =>
    locator.evaluate((el) => {
      const bloco = el.closest('[style*="top"]')
      return Number.parseFloat(bloco.style.top)
    })

  const topoEvento = await topoDe(evento)
  const topoTarefa = await topoDe(tarefa)

  check(
    'evento das 9h posicionado na linha das 9h',
    Math.abs(topoEvento - 9 * HOUR_HEIGHT) < 1,
    `top=${topoEvento} esperado=${9 * HOUR_HEIGHT}`,
  )
  check(
    'tarefa das 14h posicionada na linha das 14h',
    Math.abs(topoTarefa - 14 * HOUR_HEIGHT) < 1,
    `top=${topoTarefa} esperado=${14 * HOUR_HEIGHT}`,
  )

  // 3. A altura reflete a duração (2h = o dobro de 1h).
  const alturaDe = async (locator) =>
    locator.evaluate((el) => {
      const bloco = el.closest('[style*="height"]')
      return Number.parseFloat(bloco.style.height)
    })

  const alturaEvento = await alturaDe(evento)
  const alturaTarefa = await alturaDe(tarefa)
  check(
    'bloco de 2h tem o dobro da altura do de 1h',
    Math.abs(alturaTarefa - 2 * alturaEvento) < 1,
    `${alturaTarefa} vs ${alturaEvento}`,
  )

  await page.screenshot({ path: `${outDir}/01-dia.png` })

  // 4. Navegação entre dias: amanhã está vazio.
  await page.getByRole('button', { name: 'Próximo dia' }).click()
  await page.getByText('Amanhã').waitFor({ timeout: 10_000 })
  await grade.getByText('Nenhum compromisso neste dia.').waitFor({ timeout: 10_000 })
  check('navegar para amanhã mostra o dia vazio', true)
  await page.screenshot({ path: `${outDir}/02-amanha.png` })

  // 5. Voltar para hoje traz os blocos de volta.
  await page.getByRole('button', { name: 'Hoje' }).click()
  await grade.getByText('Reunião de time').waitFor({ timeout: 10_000 })
  check('botão Hoje volta para o dia atual', true)

  // 6. A lista de tarefas segue funcionando ao lado.
  const composer = page.getByLabel('Nova tarefa')
  await composer.fill('Tarefa solta')
  await composer.press('Enter')
  await page.getByRole('button', { name: 'Tarefa solta', exact: true }).waitFor({ timeout: 10_000 })
  check('lista de tarefas continua funcionando ao lado da grade', true)

  // Tarefa sem horário não deve entrar na grade — ela vive na lista.
  const naGrade = await grade.getByText('Tarefa solta').count()
  check('tarefa sem horário não aparece na grade', naGrade === 0)

  await page.screenshot({ path: `${outDir}/03-final.png` })

  check('sem erros no console', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
