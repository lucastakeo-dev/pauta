/**
 * Fumaça da tela de tarefas, com navegador de verdade.
 *
 * Cobre o que só aparece no browser: entrada rápida, atualização otimista ao concluir,
 * edição inline, filtro por projeto e o estado vazio.
 *
 * Uso: node scripts/smoke-tasks.mjs [diretorio-de-saida]
 * Requer web em :5176 e API em :3334.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const WEB = 'http://localhost:5176'
const outDir = process.argv[2] ?? 'smoke-out'
const results = []

function check(name, passed, detail = '') {
  results.push({ name, passed })
  console.log(`${passed ? 'OK  ' : 'FALHA'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

/**
 * O título da tarefa é sempre um `<button>` (clicar edita). Um `getByText` casaria
 * também com o rótulo sr-only do checkbox, que repete o título.
 */
function tarefa(page, titulo) {
  return page.getByRole('button', { name: titulo, exact: true })
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
})

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

// O teste de nome repetido provoca um 409 de propósito. O navegador loga toda resposta
// 4xx no console, então esse ruído precisa ser separado de erro de verdade — senão a
// checagem final vira um alarme que sempre toca e para de ser lida.
let esperando409 = false
const consoleErrors = []
page.on('console', (message) => {
  if (message.type() !== 'error') return
  if (esperando409 && message.text().includes('409')) return
  consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(String(error)))

mkdirSync(outDir, { recursive: true })

try {
  // Conta nova a cada execução: o teste começa sempre de um estado conhecido.
  const email = `tarefas-${Date.now()}@exemplo.dev`
  await page.goto(`${WEB}/signin`, { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Criar uma' }).click()
  await page.waitForURL((url) => url.pathname === '/signup', { timeout: 10_000 })
  await page.getByLabel('Nome').fill('Takeo')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('/signin'), { timeout: 10_000 })

  // 1. Conta nova começa sem tarefa, e o vazio explica o que fazer.
  await page.getByText('Nada por aqui.').waitFor({ timeout: 10_000 })
  check('estado vazio orienta o primeiro passo', true)
  await page.screenshot({ path: `${outDir}/01-vazio.png` })

  // 2. Entrada rápida: digitar e Enter.
  const composer = page.getByLabel('Nova tarefa')
  await composer.fill('Comprar café')
  await composer.press('Enter')
  await tarefa(page, 'Comprar café').waitFor({ timeout: 10_000 })
  check('entrada rápida cria a tarefa', true)

  // 3. O sufixo "p1" vira prioridade e sai do título.
  await composer.fill('Pagar boleto p1')
  await composer.press('Enter')
  await tarefa(page, 'Pagar boleto').waitFor({ timeout: 10_000 })
  const semSufixo = (await tarefa(page, 'Pagar boleto p1').count()) === 0
  check('sufixo de prioridade sai do título', semSufixo)

  await composer.fill('Ler artigo')
  await composer.press('Enter')
  await tarefa(page, 'Ler artigo').waitFor({ timeout: 10_000 })

  await page.screenshot({ path: `${outDir}/02-lista.png` })

  // 4. Concluir esconde da lista (o padrão oculta concluídas).
  // `.click()` e não `.check()`: a tarefa sai da lista no mesmo instante, então não há
  // elemento sobrando para o Playwright conferir o estado depois do clique.
  await page.getByRole('checkbox', { name: /Concluir Ler artigo/ }).click()
  await tarefa(page, 'Ler artigo').waitFor({ state: 'detached', timeout: 10_000 })
  check('concluir tira a tarefa da lista padrão', true)

  // 5. "Mostrar concluídas" traz de volta, riscada.
  await page.getByLabel('Mostrar concluídas').check()
  await tarefa(page, 'Ler artigo').waitFor({ timeout: 10_000 })
  const riscada = await tarefa(page, 'Ler artigo').evaluate(
    (el) => getComputedStyle(el).textDecorationLine,
  )
  check(
    'concluída aparece riscada ao mostrar concluídas',
    riscada.includes('line-through'),
    riscada,
  )
  await page.getByLabel('Mostrar concluídas').uncheck()

  // 6. Edição inline do título.
  await tarefa(page, 'Comprar café').click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Comprar café especial')
  await page.keyboard.press('Enter')
  await tarefa(page, 'Comprar café especial').waitFor({ timeout: 10_000 })
  check('edição inline salva o novo título', true)

  // 7. Projeto novo nasce num diálogo, com nome e cor.
  const gatilhoProjeto = page.getByRole('button', { name: 'Novo projeto' })
  await gatilhoProjeto.click()
  const dialogo = page.getByRole('dialog', { name: 'Novo projeto' })
  await dialogo.waitFor({ timeout: 10_000 })

  // O Radix leva o foco sozinho: quem abriu já pode digitar.
  const focoNoCampo = await dialogo
    .getByLabel('Nome')
    .evaluate((campo) => campo === document.activeElement)
  check('diálogo abre com o foco no nome', focoNoCampo)

  await dialogo.getByLabel('Nome').fill('Casa')
  await dialogo.getByRole('radio', { name: 'Verde' }).click()
  await dialogo.getByRole('button', { name: 'Criar' }).click()
  await dialogo.waitFor({ state: 'detached', timeout: 10_000 })
  await page.getByRole('button', { name: /^Casa/ }).waitFor({ timeout: 10_000 })
  check('projeto criado aparece na barra lateral', true)

  // Nome repetido é erro de negócio: o diálogo segura a pessoa dentro dele.
  esperando409 = true
  await gatilhoProjeto.click()
  await dialogo.waitFor({ timeout: 10_000 })
  await dialogo.getByLabel('Nome').fill('Casa')
  await dialogo.getByRole('button', { name: 'Criar' }).click()
  await dialogo.getByText(/já existe/i).waitFor({ timeout: 10_000 })
  check('nome repetido mantém o diálogo aberto com o erro', true)

  esperando409 = false

  await page.keyboard.press('Escape')
  await dialogo.waitFor({ state: 'detached', timeout: 10_000 })
  const focoVoltou = await gatilhoProjeto.evaluate((botao) => botao === document.activeElement)
  check('Esc fecha e devolve o foco ao gatilho', focoVoltou)

  await page.getByRole('button', { name: /^Casa/ }).click()
  await composer.fill('Trocar lâmpada')
  await composer.press('Enter')
  await tarefa(page, 'Trocar lâmpada').waitFor({ timeout: 10_000 })

  // Com o projeto filtrado, só a tarefa dele aparece.
  const soDoProjeto = (await tarefa(page, 'Comprar café especial').count()) === 0
  check('filtro por projeto esconde as demais', soDoProjeto)

  // A geometria da lista: uma tarefa é uma linha. É o primeiro valor que se perde
  // quando alguém acrescenta mais uma informação à direita, e sem medir ninguém nota.
  const linha = page.getByRole('listitem').filter({ hasText: 'Trocar lâmpada' }).first()
  const altura = (await linha.boundingBox()).height
  check('a tarefa cabe numa linha', altura <= 40, `${Math.round(altura)}px`)

  const dentroDoProjeto = await linha.innerText()
  check(
    'dentro do projeto, a linha não repete o nome dele',
    !dentroDoProjeto.includes('Casa'),
    JSON.stringify(dentroDoProjeto.replace(/\n/g, ' ')),
  )
  await page.screenshot({ path: `${outDir}/03-projeto.png` })

  // 8. "Todas" volta a mostrar tudo, e o contador do projeto aparece.
  await page.getByRole('button', { name: 'Todas' }).click()
  await tarefa(page, 'Comprar café especial').waitFor({ timeout: 10_000 })

  const foraDoProjeto = await page
    .getByRole('listitem')
    .filter({ hasText: 'Trocar lâmpada' })
    .first()
    .innerText()
  check(
    'fora dele, a linha mostra a que projeto pertence',
    foraDoProjeto.includes('Casa'),
    JSON.stringify(foraDoProjeto.replace(/\n/g, ' ')),
  )
  const contador = await page.getByRole('button', { name: /^Casa/ }).getAttribute('aria-label')
  check('projeto mostra a contagem de tarefas em aberto', contador?.includes('1'), contador ?? '')

  // 9. Remover.
  await page.getByRole('button', { name: /Remover tarefa: Trocar lâmpada/ }).click()
  await tarefa(page, 'Trocar lâmpada').waitFor({ state: 'detached', timeout: 10_000 })
  check('remover tira a tarefa da lista', true)

  await page.screenshot({ path: `${outDir}/04-final.png` })

  check('sem erros no console', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
