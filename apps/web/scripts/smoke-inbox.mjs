/**
 * Fumaça do inbox, com navegador de verdade.
 *
 * A tela existe para dar saída ao que o `⌘K` captura, então é isso que se verifica: o
 * que entra aparece na fila, o item aberto pode receber projeto, prioridade e prazo, e
 * processar o tira da fila sem destruir o resto do que ele carrega.
 *
 * Uso: node scripts/smoke-inbox.mjs [diretorio-de-saida]
 * Requer web em :5176 e API em :3334.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const API = 'http://localhost:3334'
const WEB = 'http://localhost:5176'
const outDir = process.argv[2] ?? 'smoke-inbox-out'
const results = []

function check(name, passed, detail = '') {
  results.push({ name, passed, detail })
  console.log(`${passed ? 'OK  ' : 'FALHA'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
})
page.on('pageerror', (e) => consoleErrors.push(String(e)))

mkdirSync(outDir, { recursive: true })

try {
  const email = `inbox-${Date.now()}@exemplo.dev`
  const registro = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Takeo Smoke', email, password: 'senha-bem-segura' }),
  }).then((r) => r.json())

  const auth = { authorization: `Bearer ${registro.token}`, 'content-type': 'application/json' }
  const post = (rota, body) =>
    fetch(`${API}${rota}`, { method: 'POST', headers: auth, body: JSON.stringify(body) }).then(
      (r) => r.json(),
    )
  const tarefas = () =>
    fetch(`${API}/tasks?includeDone=true`, { headers: auth }).then((r) => r.json())

  /**
   * Espera o servidor refletir a mudança antes de conferir o resto.
   *
   * Ler logo depois do clique não serve: a escrita é otimista, a tela muda antes da
   * resposta, e a leitura pegaria o estado anterior — ou o de uma escrita ainda em voo.
   */
  const esperarTarefa = async (titulo, condicao, prazo = 10_000) => {
    const limite = Date.now() + prazo
    let ultima = null

    while (Date.now() < limite) {
      ultima = (await tarefas()).find((t) => t.title === titulo)
      if (ultima && condicao(ultima)) return ultima
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    return ultima
  }

  const resumo = (t) =>
    `${t.status}, P${t.priority}, ${t.project?.name ?? 'sem projeto'}, [${t.labels
      .map((l) => l.name)
      .join(' ')}]`

  await post('/projects', { name: 'Casa', icon: 'house' })
  const urgente = await post('/labels', { name: 'urgente', color: '#E5484D' })

  // Sem `status`: é o padrão `inbox` que a captura usa, e é ele que a fila mostra.
  await post('/tasks', { title: 'Primeira captura' })
  await post('/tasks', { title: 'Segunda captura', priority: 1, labelIds: [urgente.id] })
  await post('/tasks', { title: 'Terceira captura' })
  // Fora da fila: prova que a lista filtra por status, e não mostra tudo.
  await post('/tasks', { title: 'Já processada', status: 'todo' })

  await page.goto(`${WEB}/signin`, { waitUntil: 'networkidle' })
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/today', { timeout: 10_000 })

  const menu = page.locator('nav[aria-label="Seções"]')
  const barra = page.locator('aside')
  const principal = page.locator('main')
  const fila = (titulo) => barra.getByRole('button', { name: `Abrir: ${titulo}`, exact: true })

  // 1. O inbox é o primeiro destino do trilho.
  await menu.getByRole('link', { name: 'Inbox', exact: true }).waitFor({ timeout: 10_000 })
  const destinos = await menu.evaluate((nav) =>
    [...nav.querySelectorAll('a')].map((el) => el.textContent.trim()),
  )
  check('o inbox abre a lista de destinos', destinos[0] === 'Inbox', destinos.join(' · '))

  await menu.getByRole('link', { name: 'Inbox', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/inbox', { timeout: 10_000 })

  // 2. A fila mostra só o que está por processar.
  await fila('Primeira captura').waitFor({ timeout: 10_000 })
  const naFila = await barra.getByRole('button', { name: /^Abrir: / }).count()
  check('a fila lista só o que está por processar', naFila === 3, `${naFila} itens`)
  check(
    'a seção conta os itens da fila',
    (await barra.getByRole('button', { name: /Por processar/ }).innerText()).includes('(3)'),
  )

  // 3. Sem escolher nada, o primeiro já vem aberto: a fila se trabalha de cima para
  //    baixo, e abrir a tela num vazio seria um clique cobrado à toa.
  await principal.getByLabel('Título').waitFor({ timeout: 10_000 })
  const abertoInicial = await principal.getByLabel('Título').inputValue()
  check('o primeiro item já vem aberto', abertoInicial === 'Primeira captura', abertoInicial)
  await page.screenshot({ path: `${outDir}/01-fila.png` })

  // 4. Escolher outro troca o detalhe — no clique e na seta.
  const abertoAgora = (titulo) =>
    page.waitForFunction(
      (esperado) => document.querySelector('main input')?.value === esperado,
      titulo,
      {
        timeout: 10_000,
      },
    )

  await fila('Terceira captura').click()
  await abertoAgora('Terceira captura')
  check('escolher um item abre o detalhe dele', true)

  // A fila se percorre com as setas, e o foco anda junto: sem isso, quem navega por
  // teclado teria de sair da lista e voltar a cada item.
  await page.keyboard.press('ArrowUp')
  await abertoAgora('Segunda captura')
  const focoNaLinha = await page.evaluate(
    () => document.activeElement?.getAttribute('aria-label') ?? '',
  )
  check(
    'a seta anda pela fila levando o foco',
    focoNaLinha === 'Abrir: Segunda captura',
    focoNaLinha,
  )

  // 5. As propriedades escrevem no servidor — uma por vez, e sem levar as outras
  //    junto. Foi exatamente isso que o PATCH quebrava: cada escrita parcial zerava o
  //    que não tinha sido enviado.
  const propriedades = principal.getByRole('complementary', { name: 'Propriedades' })

  await propriedades.getByRole('combobox', { name: 'Projeto' }).selectOption({ label: 'Casa' })
  const comProjeto = await esperarTarefa('Segunda captura', (t) => t.project?.name === 'Casa')
  check(
    'escolher o projeto guarda prioridade e etiquetas',
    comProjeto.priority === 1 && comProjeto.labels.length === 1,
    resumo(comProjeto),
  )
  check('e o item continua na fila', comProjeto.status === 'inbox', comProjeto.status)

  // A linha da fila também tem de acompanhar: é lá que o projeto aparece.
  await page.waitForFunction(
    () => document.querySelector('aside [aria-current="true"]')?.textContent.includes('Casa'),
    { timeout: 10_000 },
  )
  check('mudar o projeto aparece na linha da fila', true)

  await propriedades.getByRole('button', { name: 'P3' }).click()
  const comPrioridade = await esperarTarefa('Segunda captura', (t) => t.priority === 3)
  check(
    'mudar a prioridade guarda projeto e etiquetas',
    comPrioridade.project?.name === 'Casa' && comPrioridade.labels.length === 1,
    resumo(comPrioridade),
  )

  // Etiqueta é a única propriedade que não é campo nativo: desmarcar tem de tirar
  // aquela etiqueta e nada mais.
  await propriedades.getByRole('button', { name: 'urgente' }).click()
  const semEtiqueta = await esperarTarefa('Segunda captura', (t) => t.labels.length === 0)
  check(
    'desmarcar a etiqueta guarda o resto',
    semEtiqueta.priority === 3 && semEtiqueta.project?.name === 'Casa',
    resumo(semEtiqueta),
  )
  await page.screenshot({ path: `${outDir}/02-detalhe.png` })

  // 6. Processar tira da fila e passa o lugar para quem vem depois.
  await principal.getByRole('button', { name: 'Processar' }).click()
  await fila('Segunda captura').waitFor({ state: 'detached', timeout: 10_000 })
  check('processar tira o item da fila', true)

  const processada = await esperarTarefa('Segunda captura', (t) => t.status === 'todo')
  check(
    'processar só troca o status',
    processada.priority === 3 && processada.project?.name === 'Casa',
    resumo(processada),
  )

  await abertoAgora('Terceira captura')
  check('a seleção assume a posição de quem saiu', true)

  // 7. O que a captura cria cai aqui, sem recarregar.
  await page.keyboard.press('Control+k')
  const dialogo = page.getByRole('dialog', { name: 'Captura rápida' })
  await dialogo.waitFor({ timeout: 10_000 })
  await dialogo.getByLabel('Captura rápida').fill('Comprar pilhas')
  await page.keyboard.press('Enter')
  await fila('Comprar pilhas').waitFor({ timeout: 10_000 })
  check('o que o ⌘K captura aparece na fila', true)

  // 8. A tela também é olhada no claro: a fila e as propriedades nasceram com tokens
  //    do escuro, e é fácil deixar passar um cinza que some no branco.
  await page.getByRole('button', { name: 'Conta', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tema claro' }).click()
  await page.waitForFunction(() => document.documentElement.classList.contains('light'), {
    timeout: 5_000,
  })
  await page.keyboard.press('Escape')
  // As linhas da fila têm `transition-colors`: fotografar na hora pega todas no meio da
  // travessia do escuro para o claro, e a captura não serve para julgar cor nenhuma.
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${outDir}/04-claro.png` })
  check('o inbox aparece no tema claro', true)

  await page.getByRole('button', { name: 'Conta', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tema escuro' }).click()
  await page.waitForFunction(() => !document.documentElement.classList.contains('light'), {
    timeout: 5_000,
  })
  await page.keyboard.press('Escape')

  // 9. Esvaziar a fila mostra o estado vazio nos dois lados.
  for (const titulo of ['Primeira captura', 'Terceira captura', 'Comprar pilhas']) {
    await fila(titulo).click()
    await abertoAgora(titulo)
    await principal.getByRole('button', { name: 'Processar' }).click()
    await fila(titulo).waitFor({ state: 'detached', timeout: 10_000 })
  }

  await barra.getByText('Nada por processar.').waitFor({ timeout: 10_000 })
  await principal.getByText('Escolha um item da fila.').waitFor({ timeout: 10_000 })
  check('fila vazia mostra o estado vazio na barra e na tela', true)
  await page.screenshot({ path: `${outDir}/03-vazio.png` })

  check('nenhum erro no console', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
