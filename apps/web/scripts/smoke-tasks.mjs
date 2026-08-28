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

const consoleErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(String(error)))

mkdirSync(outDir, { recursive: true })

try {
  // Conta nova a cada execução: o teste começa sempre de um estado conhecido.
  const email = `tarefas-${Date.now()}@exemplo.dev`
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Criar uma/ }).click()
  await page.getByLabel('Nome').fill('Takeo')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 })

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

  // 7. Projeto novo aparece na barra lateral e filtra.
  await page.getByRole('button', { name: 'Novo projeto' }).click()
  await page.getByLabel('Novo projeto').fill('Casa')
  await page.getByLabel('Novo projeto').press('Enter')
  await page.getByRole('button', { name: /^Casa/ }).waitFor({ timeout: 10_000 })
  check('projeto criado aparece na barra lateral', true)

  await page.getByRole('button', { name: /^Casa/ }).click()
  await composer.fill('Trocar lâmpada')
  await composer.press('Enter')
  await tarefa(page, 'Trocar lâmpada').waitFor({ timeout: 10_000 })

  // Com o projeto filtrado, só a tarefa dele aparece.
  const soDoProjeto = (await tarefa(page, 'Comprar café especial').count()) === 0
  check('filtro por projeto esconde as demais', soDoProjeto)
  await page.screenshot({ path: `${outDir}/03-projeto.png` })

  // 8. "Todas" volta a mostrar tudo, e o contador do projeto aparece.
  await page.getByRole('button', { name: 'Todas' }).click()
  await tarefa(page, 'Comprar café especial').waitFor({ timeout: 10_000 })
  const contador = await page.getByRole('button', { name: /^Casa/ }).textContent()
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
