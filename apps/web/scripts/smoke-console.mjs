/**
 * Fumaça do Console de captura rápida.
 *
 * O parser tem 86 testes unitários; aqui provamos o que só existe no navegador: o
 * atalho global, a prévia ao vivo, e a tarefa chegando ao servidor com o que a prévia
 * prometeu — inclusive o projeto e a etiqueta criados na hora.
 *
 * Uso: node scripts/smoke-console.mjs [diretorio-de-saida]
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
  const email = `console-${Date.now()}@exemplo.dev`
  const registro = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Takeo', email, password: 'senha-bem-segura' }),
  }).then((r) => r.json())

  const auth = { authorization: `Bearer ${registro.token}` }

  await page.goto(`${WEB}/signin`, { waitUntil: 'networkidle' })
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('/signin'), { timeout: 10_000 })

  const dialogo = page.getByRole('dialog', { name: 'Captura rápida' })

  // 1. O atalho abre de qualquer lugar — inclusive com o foco num campo de texto.
  await page.getByLabel('Nova tarefa').focus()
  await page.keyboard.press('Control+k')
  await dialogo.waitFor({ timeout: 10_000 })
  check('Ctrl+K abre o console mesmo com foco num campo', true)

  const campo = dialogo.getByLabel('Captura rápida')
  check(
    'o foco vai direto para o campo',
    await campo.evaluate((el) => el === document.activeElement),
  )

  // 2. Prévia ao vivo enquanto digita.
  await campo.fill('almoço com a Ana amanhã 13h #pessoal @Casa p2')
  await dialogo.getByText('amanhã às 13:00').waitFor({ timeout: 5_000 })
  check('a prévia mostra a data interpretada', true)

  // O aviso de "novo" depende da lista de projetos ter carregado, enquanto a prévia da
  // data é parse puro e aparece na hora. Esperamos o aviso antes de ler o texto todo.
  await dialogo.getByText('novo projeto').waitFor({ timeout: 5_000 })

  const previa = await dialogo.textContent()
  check('a prévia mostra o título limpo', previa.includes('almoço com a Ana'))
  check(
    'a prévia mostra projeto, etiqueta e prioridade',
    previa.includes('em Casa') && previa.includes('#pessoal') && previa.includes('P2'),
  )

  // O aviso de "novo" é a salvaguarda contra erro de digitação virar projeto.
  check('avisa que o projeto será criado', previa.includes('novo projeto'))
  check('avisa que a etiqueta será criada', previa.includes('nova'))

  await page.screenshot({ path: `${outDir}/01-previa.png` })

  // 3. Enter salva, e o servidor recebe o que a prévia prometeu.
  await page.keyboard.press('Enter')
  await dialogo.waitFor({ state: 'detached', timeout: 10_000 })
  check('Enter salva e fecha o console', true)

  const tarefas = await fetch(`${API}/tasks?includeDone=true`, { headers: auth }).then((r) =>
    r.json(),
  )
  const criada = tarefas.find((t) => t.title === 'almoço com a Ana')

  check('a tarefa chegou ao servidor com o título limpo', Boolean(criada))
  check('com a prioridade escrita', criada?.priority === 2, `P${criada?.priority}`)
  check('com o projeto criado na hora', criada?.project?.name === 'Casa', criada?.project?.name)
  check('com a etiqueta criada na hora', criada?.labels?.[0]?.name === 'pessoal')

  const inicio = criada?.scheduledStart ? new Date(criada.scheduledStart) : null
  check('agendada no horário interpretado', inicio?.getHours() === 13, `${inicio?.getHours()}h`)

  // 4. Segunda captura reaproveita o projeto em vez de duplicar.
  await page.keyboard.press('Control+k')
  await dialogo.waitFor({ timeout: 10_000 })
  await campo.fill('comprar tinta @casa')
  await dialogo.getByText('comprar tinta').waitFor({ timeout: 5_000 })

  const segundaPrevia = await dialogo.textContent()
  check('projeto existente não é marcado como novo', !segundaPrevia.includes('novo projeto'))

  await page.keyboard.press('Enter')
  await dialogo.waitFor({ state: 'detached', timeout: 10_000 })

  const projetos = await fetch(`${API}/projects`, { headers: auth }).then((r) => r.json())
  check(
    'não duplicou o projeto ao escrever em minúscula',
    projetos.length === 1,
    `${projetos.length} projeto(s)`,
  )

  // 5. Esc fecha sem salvar.
  await page.keyboard.press('Control+k')
  await dialogo.waitFor({ timeout: 10_000 })
  await campo.fill('isto não deve ser salvo')
  await page.keyboard.press('Escape')
  await dialogo.waitFor({ state: 'detached', timeout: 10_000 })

  const depois = await fetch(`${API}/tasks?includeDone=true`, { headers: auth }).then((r) =>
    r.json(),
  )
  check('Esc fecha sem criar nada', !depois.some((t) => t.title.includes('não deve ser salvo')))

  await page.screenshot({ path: `${outDir}/02-final.png` })

  check('sem erros no console', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
