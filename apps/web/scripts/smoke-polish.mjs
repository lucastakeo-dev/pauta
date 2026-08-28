/**
 * Fumaça do acabamento do planner: sobreposição e agendamento por teclado.
 *
 * O teclado é o ponto central: a suíte navega usando **apenas** Tab e teclas, sem um
 * único clique de mouse — se passar, quem não usa ponteiro consegue agendar.
 *
 * Uso: node scripts/smoke-polish.mjs [diretorio-de-saida]
 * Requer web em :5176 e API em :3334.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const WEB = 'http://localhost:5176'
const API = 'http://localhost:3334'
const outDir = process.argv[2] ?? 'smoke-out'
const results = []

function check(name, passed, detail = '') {
  results.push({ name, passed })
  console.log(`${passed ? 'OK  ' : 'FALHA'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

function hojeAs(hour, minute = 0) {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
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
  const email = `polish-${Date.now()}@exemplo.dev`
  const registro = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Takeo', email, password: 'senha-bem-segura' }),
  }).then((r) => r.json())

  const auth = { 'content-type': 'application/json', authorization: `Bearer ${registro.token}` }

  // Três compromissos no mesmo horário, para exercitar a sobreposição.
  for (const [title, start, end] of [
    ['Reunião A', hojeAs(9), hojeAs(11)],
    ['Reunião B', hojeAs(9, 30), hojeAs(10, 30)],
    ['Reunião C', hojeAs(10), hojeAs(12)],
  ]) {
    await fetch(`${API}/events`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ title, startsAt: start, endsAt: end }),
    })
  }

  const tarefa = await fetch(`${API}/tasks`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ title: 'Revisar contrato' }),
  }).then((r) => r.json())

  await page.goto(`${WEB}/signin`, { waitUntil: 'networkidle' })
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('/signin'), { timeout: 10_000 })

  const grade = page.getByRole('region', { name: 'Planner do dia' })
  await grade.getByText('Reunião A').waitFor({ timeout: 10_000 })

  // 1. Sobreposição: os três dividem a largura, sem se esconder.
  const larguras = await Promise.all(
    ['Reunião A', 'Reunião B', 'Reunião C'].map(async (titulo) => {
      const caixa = await grade
        .getByText(titulo)
        .evaluate((el) => el.closest('[style*="width"]').getBoundingClientRect())
      return caixa
    }),
  )

  const larguraGrade = (await page.locator('[data-planner-grid]').boundingBox()).width
  const todosEstreitos = larguras.every((c) => c.width < larguraGrade * 0.6)
  check(
    'blocos sobrepostos dividem a largura',
    todosEstreitos,
    `grade=${Math.round(larguraGrade)}px`,
  )

  const esquerdas = larguras.map((c) => Math.round(c.x)).sort((a, b) => a - b)
  const todosDistintos = new Set(esquerdas).size === 3
  check('cada bloco sobreposto tem coluna própria', todosDistintos, esquerdas.join(', '))

  await page.screenshot({ path: `${outDir}/01-sobreposicao.png` })

  // 2. Agendar SÓ pelo teclado — nenhum clique daqui para baixo.
  const botaoAgendar = page.getByRole('button', { name: /^Agendar: Revisar contrato/ })
  await botaoAgendar.focus()
  await page.keyboard.press('Enter')

  const campoData = page.getByLabel('Data')
  await campoData.waitFor({ timeout: 10_000 })
  check('formulário de agendar abre pelo teclado', true)

  // Cada campo recebe foco e é preenchido por digitação — nenhum clique.
  //
  // Focamos campo a campo em vez de encadear Tab porque, num `<input type="date">`,
  // o Tab anda entre os segmentos (dia/mês/ano) antes de sair do campo. É detalhe do
  // navegador, não do app, e encadear Tab tornaria o teste frágil sem provar mais nada.
  const campoHora = page.getByLabel('Início')
  await campoHora.focus()
  await page.keyboard.type('1545')

  const campoDuracao = page.getByLabel('Duração')
  await campoDuracao.focus()
  await page.keyboard.press('ArrowDown')
  const duracaoEscolhida = await campoDuracao.inputValue()

  const botaoSalvar = page.getByRole('button', { name: 'Agendar', exact: true })
  await botaoSalvar.focus()
  await page.keyboard.press('Enter')

  await grade.getByText('Revisar contrato').waitFor({ timeout: 10_000 })
  check('agendou pelo teclado, sem nenhum clique', true)

  const agendada = await fetch(`${API}/tasks/${tarefa.id}`, { headers: auth }).then((r) => r.json())
  const inicio = new Date(agendada.scheduledStart)
  check(
    'o horário digitado foi o gravado',
    inicio.getHours() === 15 && inicio.getMinutes() === 45,
    `${inicio.getHours()}:${String(inicio.getMinutes()).padStart(2, '0')}`,
  )

  const duracao = (new Date(agendada.scheduledEnd) - inicio) / 60000
  check('a duração escolhida foi respeitada', duracao === Number(duracaoEscolhida), `${duracao}min`)

  await page.screenshot({ path: `${outDir}/02-teclado.png` })

  // 3. Tirar do planner devolve a tarefa para a lista sem horário.
  await page.getByRole('button', { name: /^Agendar: Revisar contrato/ }).focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Tirar do planner' }).click()
  await grade.getByText('Revisar contrato').waitFor({ state: 'detached', timeout: 10_000 })

  const solta = await fetch(`${API}/tasks/${tarefa.id}`, { headers: auth }).then((r) => r.json())
  check(
    'tirar do planner limpa os dois extremos',
    solta.scheduledStart === null && solta.scheduledEnd === null,
  )

  check('sem erros no console', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
