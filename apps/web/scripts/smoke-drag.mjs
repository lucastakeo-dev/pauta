/**
 * Fumaça do arrastar-para-agendar, com navegador de verdade.
 *
 * É a única forma de provar esta wave: a geometria tem teste unitário, mas o gesto —
 * pegar, mover, soltar e persistir — só existe no browser.
 *
 * Uso: node scripts/smoke-drag.mjs [diretorio-de-saida]
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

/** Arrasta em passos: um único movimento não dispara os sensores do dnd-kit. */
async function dragTo(page, from, to) {
  const origem = await from.boundingBox()
  await page.mouse.move(origem.x + origem.width / 2, origem.y + origem.height / 2)
  await page.mouse.down()

  // O primeiro passo curto vence a distância de ativação sem pular o alvo.
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
  const email = `drag-${Date.now()}@exemplo.dev`
  const registro = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Takeo', email, password: 'senha-bem-segura' }),
  }).then((r) => r.json())

  const auth = { 'content-type': 'application/json', authorization: `Bearer ${registro.token}` }

  const tarefa = await fetch(`${API}/tasks`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ title: 'Escrever proposta' }),
  }).then((r) => r.json())

  await page.goto(WEB, { waitUntil: 'networkidle' })
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('/entrar'), { timeout: 10_000 })

  const grade = page.getByRole('region', { name: 'Planner do dia' })
  await grade.waitFor({ timeout: 10_000 })

  const areaGrade = page.locator('[data-planner-grid]')
  const caixaGrade = await areaGrade.boundingBox()

  /**
   * Coordenada de tela para uma hora do dia.
   *
   * Só vale para horas visíveis: mirar abaixo da janela faz o ponteiro ser clampeado
   * na borda e o dnd-kit auto-rolar, e o bloco cai numa hora diferente da pedida.
   */
  async function pontoNaHora(hour) {
    const topoConteudo = (await areaGrade.boundingBox()).y
    const y = topoConteudo + hour * HOUR_HEIGHT + 8

    if (y > page.viewportSize().height - 20) {
      throw new Error(`hora ${hour} está fora da janela (y=${Math.round(y)}) — escolha outra`)
    }

    return { x: caixaGrade.x + caixaGrade.width / 2, y }
  }

  /** Lê da API o horário gravado — a fonte da verdade, não o DOM. */
  async function horarioGravado() {
    const t = await fetch(`${API}/tasks/${tarefa.id}`, { headers: auth }).then((r) => r.json())
    return { start: t.scheduledStart, end: t.scheduledEnd }
  }

  // A grade abre na hora atual; rolamos para o topo para ter horas previsíveis.
  await page.locator('[data-planner-grid]').evaluate((el) => {
    el.parentElement.scrollTop = 0
  })
  await page.waitForTimeout(200)

  // 1. Arrastar da lista para a grade agenda a tarefa.
  const alca = page.getByRole('button', { name: /Arrastar para o planner: Escrever proposta/ })
  await alca.waitFor({ timeout: 10_000 })
  await alca.hover()

  await dragTo(page, alca, await pontoNaHora(10))
  await grade.getByText('Escrever proposta').waitFor({ timeout: 10_000 })
  check('arrastar da lista para a grade cria o bloco', true)

  const agendado = await horarioGravado()
  const horaInicio = new Date(agendado.start).getHours()
  check('o horário gravado bate com onde foi solto', horaInicio === 10, `${horaInicio}h`)

  const duracao = (new Date(agendado.end) - new Date(agendado.start)) / 60000
  check('tarefa sem estimativa vira bloco de 1h', duracao === 60, `${duracao}min`)

  await page.screenshot({ path: `${outDir}/01-agendada.png` })

  // 2. Mover o bloco dentro da grade.
  const bloco = grade.getByText('Escrever proposta')
  await dragTo(page, bloco, await pontoNaHora(13))
  await page.waitForTimeout(900)

  const movido = await horarioGravado()
  const novaHora = new Date(movido.start).getHours()
  check('mover o bloco reagenda a tarefa', novaHora > horaInicio, `${horaInicio}h → ${novaHora}h`)

  const duracaoAposMover = (new Date(movido.end) - new Date(movido.start)) / 60000
  check('mover preserva a duração', duracaoAposMover === 60, `${duracaoAposMover}min`)

  await page.screenshot({ path: `${outDir}/02-movida.png` })

  // 3. Redimensionar pela borda de baixo.
  //
  // Miramos a alça pelo nome acessível, e não a caixa de `getByText`: aquela é a do
  // parágrafo do título (16px de altura), não a do bloco — foi o que me enganou antes.
  const alcaResize = page.getByRole('button', { name: /Ajustar duração de Escrever proposta/ })
  await alcaResize.scrollIntoViewIfNeeded()
  const caixaAlca = await alcaResize.boundingBox()

  await page.mouse.move(caixaAlca.x + caixaAlca.width / 2, caixaAlca.y + caixaAlca.height / 2)
  await page.mouse.down()

  // Passos curtos: o gesto instala os ouvintes no primeiro movimento.
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(
      caixaAlca.x + caixaAlca.width / 2,
      caixaAlca.y + caixaAlca.height / 2 + (i * HOUR_HEIGHT) / 10,
    )
    await page.waitForTimeout(20)
  }
  await page.mouse.up()
  await page.waitForTimeout(900)

  const redimensionado = await horarioGravado()
  const novaDuracao = (new Date(redimensionado.end) - new Date(redimensionado.start)) / 60000
  check('redimensionar estica a duração', novaDuracao > 60, `60min → ${novaDuracao}min`)
  check('o início não se move ao redimensionar', redimensionado.start === movido.start)

  await page.screenshot({ path: `${outDir}/03-redimensionada.png` })

  // 4. A tarefa agendada continua na lista, agora com horário.
  const naLista = page.getByRole('button', { name: 'Escrever proposta', exact: true })
  check('a tarefa segue na lista após ser agendada', (await naLista.count()) > 0)

  check('sem erros no console', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
