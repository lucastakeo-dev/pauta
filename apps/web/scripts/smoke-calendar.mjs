/**
 * Fumaça da integração do calendário, com navegador de verdade.
 *
 * Duas promessas para provar: o que tem data aparece no calendário, e o que nasce
 * clicando nele vira dado de verdade. Nenhuma das duas é visível para `app.inject` —
 * uma é geometria de tela, a outra é gesto.
 *
 * Uso: node scripts/smoke-calendar.mjs [diretorio-de-saida]
 * Requer web em :5176 e API em :3334.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const API = 'http://localhost:3334'
const WEB = 'http://localhost:5176'
const HOUR_HEIGHT = 56
const outDir = process.argv[2] ?? 'smoke-calendar-out'
const results = []

function check(name, passed, detail = '') {
  results.push({ name, passed })
  console.log(`${passed ? 'OK  ' : 'FALHA'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

/** Arrasta em passos: um único movimento não dispara os sensores do dnd-kit. */
async function dragTo(page, from, to) {
  const origem = await from.boundingBox()
  await page.mouse.move(origem.x + origem.width / 2, origem.y + origem.height / 2)
  await page.mouse.down()
  await page.mouse.move(origem.x + origem.width / 2, origem.y + origem.height / 2 + 12, {
    steps: 4,
  })
  await page.mouse.move(to.x, to.y, { steps: 18 })
  await page.mouse.up()
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
  const email = `cal-${Date.now()}@exemplo.dev`
  const registro = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Takeo', email, password: 'senha-bem-segura' }),
  }).then((r) => r.json())

  const auth = { 'content-type': 'application/json', authorization: `Bearer ${registro.token}` }
  const post = (rota, body) =>
    fetch(`${API}${rota}`, { method: 'POST', headers: auth, body: JSON.stringify(body) }).then(
      (r) => r.json(),
    )

  const hora = (h, m = 0) => {
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const meiaNoite = (offset = 0) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }

  const casa = await post('/projects', { name: 'Casa', icon: 'house', color: '#4FB477' })
  const prazo = await post('/tasks', {
    title: 'Pagar condomínio',
    projectId: casa.id,
    dueAt: hora(12),
    status: 'todo',
  })
  // Vence hoje e já tem bloco hoje: só a grade a mostra, para não contar duas vezes.
  await post('/tasks', {
    title: 'Revisar contrato',
    dueAt: hora(12),
    scheduledStart: hora(20),
    scheduledEnd: hora(21),
    status: 'todo',
  })
  await post('/events', {
    title: 'Feriado municipal',
    allDay: true,
    startsAt: meiaNoite(),
    endsAt: meiaNoite(1),
  })

  await page.goto(`${WEB}/signin`, { waitUntil: 'networkidle' })
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/today', { timeout: 10_000 })

  const faixa = page.locator('[data-planner-allday]')
  const grade = page.locator('[data-planner-grid]').first()

  // 1. O que tem data aparece na faixa do dia todo.
  await faixa.waitFor({ timeout: 10_000 })
  const textoFaixa = await faixa.innerText()
  check(
    'o prazo do dia aparece na faixa',
    textoFaixa.includes('Pagar condomínio'),
    textoFaixa.replace(/\n/g, ' · '),
  )
  check('o evento de dia inteiro também', textoFaixa.includes('Feriado municipal'))
  check(
    'a tarefa que já tem bloco hoje não se repete na faixa',
    !textoFaixa.includes('Revisar contrato'),
  )

  // Antes, o evento de dia inteiro virava um bloco de 24h cobrindo a grade.
  const naGrade = await grade.innerText()
  check('o evento de dia inteiro não vira bloco de 24h', !naGrade.includes('Feriado municipal'))
  await page.screenshot({ path: `${outDir}/01-faixa.png` })

  // 2. Clicar num horário vazio abre o compositor naquele horário.
  await page.locator('[data-planner-scroll]').evaluate((el) => {
    el.scrollTop = 0
  })
  await page.waitForTimeout(200)

  const caixa = await grade.boundingBox()
  const pontoNaHora = (h) => ({ x: caixa.x + caixa.width / 2, y: caixa.y + h * HOUR_HEIGHT + 8 })

  await page.mouse.click(pontoNaHora(10).x, pontoNaHora(10).y)
  const cartao = page.getByRole('form', { name: 'Novo no calendário' })
  await cartao.waitFor({ timeout: 5_000 })

  // 8px dentro da hora das 10 são ~8 minutos, que o encaixe de 15 arredonda para 10:15.
  // A conferência é essa: o cartão abre onde o ponteiro caiu, já encaixado.
  const horario = await cartao.innerText()
  check(
    'o compositor abre no horário clicado, encaixado no quarto de hora',
    horario.includes('10:15 – 11:15'),
    horario.replace(/\n/g, ' '),
  )
  await page.screenshot({ path: `${outDir}/02-compositor.png` })

  // 3. Enter cria o compromisso, e ele chega ao servidor com o horário certo.
  await cartao.getByLabel('Título').fill('Reunião de urgência')
  await page.keyboard.press('Enter')
  await grade.getByText('Reunião de urgência').waitFor({ timeout: 10_000 })
  check('Enter cria o compromisso na grade', true)

  const eventos = await fetch(`${API}/events?from=${meiaNoite()}&to=${meiaNoite(1)}`, {
    headers: auth,
  }).then((r) => r.json())
  const criado = eventos.find((e) => e.title === 'Reunião de urgência')
  check(
    'o compromisso foi gravado no horário clicado',
    criado && new Date(criado.startsAt).getHours() === 10,
    criado ? new Date(criado.startsAt).toTimeString().slice(0, 5) : 'não veio',
  )
  const duracao = criado ? (new Date(criado.endsAt) - new Date(criado.startsAt)) / 60_000 : 0
  check('com a duração padrão de 1h', duracao === 60, `${duracao}min`)

  // 4. A alternância cria tarefa agendada — e ela vive nas duas telas.
  await page.mouse.click(pontoNaHora(8).x, pontoNaHora(8).y)
  await cartao.waitFor({ timeout: 5_000 })
  await cartao.getByRole('button', { name: 'Tarefa' }).click()
  await cartao.getByLabel('Título').fill('Escrever proposta')
  await page.keyboard.press('Enter')

  await page.getByRole('button', { name: 'Escrever proposta', exact: true }).waitFor({
    timeout: 10_000,
  })
  check('a alternância cria tarefa, e ela aparece na lista', true)

  const tarefas = await fetch(`${API}/tasks?includeDone=true`, { headers: auth }).then((r) =>
    r.json(),
  )
  const nova = tarefas.find((t) => t.title === 'Escrever proposta')
  check(
    'a tarefa nasce agendada e já processada',
    nova?.status === 'todo' && new Date(nova.scheduledStart).getHours() === 8,
    `${nova?.status}, ${nova ? new Date(nova.scheduledStart).getHours() : '?'}h`,
  )
  await page.screenshot({ path: `${outDir}/03-criados.png` })

  // 5. Abrir o compromisso, renomear e excluir — criar sem desfazer seria um beco.
  await page.getByRole('button', { name: 'Abrir Reunião de urgência' }).click()
  const detalhe = page.getByRole('region', { name: 'Compromisso' })
  await detalhe.waitFor({ timeout: 5_000 })

  await detalhe.getByLabel('Título').fill('Reunião com o jurídico')
  await page.keyboard.press('Enter')
  await grade.getByText('Reunião com o jurídico').waitFor({ timeout: 10_000 })
  check('renomear o compromisso pela grade', true)

  await page.getByRole('button', { name: 'Abrir Reunião com o jurídico' }).click()
  await detalhe.getByRole('button', { name: 'Excluir', exact: true }).click()
  await grade.getByText('Reunião com o jurídico').waitFor({ state: 'detached', timeout: 10_000 })
  check('excluir tira o compromisso da grade', true)

  // 6. O chip da faixa é arrastável: é o gesto que vira "vence hoje" em "faço às 13h".
  const chip = page.getByRole('button', { name: /Arrastar para um horário: Pagar condomínio/ })
  await chip.hover()
  await dragTo(page, chip, pontoNaHora(13))
  await page.waitForTimeout(1_000)

  const agendada = await fetch(`${API}/tasks/${prazo.id}`, { headers: auth }).then((r) => r.json())
  check(
    'arrastar o prazo para a grade agenda a tarefa',
    agendada.scheduledStart !== null && new Date(agendada.scheduledStart).getHours() === 13,
    agendada.scheduledStart
      ? new Date(agendada.scheduledStart).toTimeString().slice(0, 5)
      : 'não agendou',
  )

  // E aí ela sai da faixa: já está desenhada na grade logo abaixo.
  await page.waitForFunction(
    () =>
      !document.querySelector('[data-planner-allday]')?.textContent.includes('Pagar condomínio'),
    { timeout: 10_000 },
  )
  check('agendada, ela deixa a faixa e passa a viver na grade', true)
  await page.screenshot({ path: `${outDir}/04-arrastada.png` })

  check('sem erros no console', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
