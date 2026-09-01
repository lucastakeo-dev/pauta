/**
 * Fumaça das escritas otimistas e do retorno de cada ação, com navegador de verdade.
 *
 * Existe porque nada disto aparece em teste de unidade: o que se mede aqui é *quando* a
 * tela reage, não o que a API responde. Por isso cada caso atrasa ou derruba a
 * requisição de propósito — se a interface só respondesse depois da resposta, esses
 * atrasos apareceriam como falha, e é essa a regressão que queremos pegar.
 *
 * Uso: node scripts/smoke-write.mjs [diretorio-de-saida]
 * Requer web em :5176 e API em :3334.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const API = 'http://localhost:3334'
const WEB = 'http://localhost:5176'
const outDir = process.argv[2] ?? 'smoke-write-out'

/** Atraso forçado nas respostas. Bem acima de qualquer resposta local real. */
const LENTIDAO_MS = 1500

/** Teto para a tela reagir. Acima disto ela está esperando o servidor. */
const LIMITE_OTIMISTA_MS = 400

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
mkdirSync(outDir, { recursive: true })

try {
  const email = `write-${Date.now()}@exemplo.dev`
  await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Takeo Smoke', email, password: 'senha-bem-segura' }),
  })

  await page.goto(`${WEB}/signin`, { waitUntil: 'networkidle' })
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/today', { timeout: 10_000 })
  await page.getByRole('heading', { name: 'Tarefas' }).waitFor({ timeout: 10_000 })

  const composer = page.getByLabel('Nova tarefa')
  const linha = (titulo) => page.getByRole('listitem').filter({ hasText: titulo }).first()

  // Sucesso e falha se distinguem pelo papel: `status` é lido na próxima pausa,
  // `alert` interrompe. O escopo no contêiner é necessário porque o dnd-kit injeta
  // uma região `status` própria na página.
  const avisos = page.locator('[data-slot=toasts]')
  const confirmacoes = avisos.getByRole('status')
  const falhas = avisos.getByRole('alert')

  /** Espera o aviso de sucesso com este texto e o dispensa, para não vazar no próximo caso. */
  async function aguardaConfirmacao(texto) {
    const aviso = confirmacoes.getByText(texto, { exact: false })
    await aviso.waitFor({ timeout: 5000 })
    await confirmacoes.getByRole('button', { name: 'Dispensar aviso' }).first().click()
    await aviso.waitFor({ state: 'detached', timeout: 5000 })
  }

  // 1. Criar: o campo limpa na hora, então a tarefa a caminho precisa aparecer em algum
  //    lugar — senão o que foi digitado some da tela até a resposta voltar.
  let segurarCriacao = true
  await page.route('**/tasks', async (route) => {
    if (route.request().method() === 'POST' && segurarCriacao) {
      await new Promise((resolve) => setTimeout(resolve, LENTIDAO_MS))
    }
    await route.continue()
  })

  await composer.fill('Tarefa demorada')
  await composer.press('Enter')

  const fantasma = page.getByLabel('Salvando: Tarefa demorada')
  await fantasma.waitFor({ timeout: LIMITE_OTIMISTA_MS })
  check('tarefa a caminho aparece na lista enquanto salva', true)
  check('campo já aceita a próxima tarefa', (await composer.inputValue()) === '')
  await page.screenshot({ path: `${outDir}/01-pendente.png` })

  await fantasma.waitFor({ state: 'detached', timeout: 10_000 })
  await linha('Tarefa demorada').waitFor({ timeout: 10_000 })
  check('ao confirmar, a linha a caminho vira a tarefa real', true)

  await aguardaConfirmacao('Tarefa criada.')
  check('criar confirma no aviso', true)
  segurarCriacao = false

  // 2. Excluir: sai da tela sem esperar a resposta.
  await page.route('**/tasks/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await new Promise((resolve) => setTimeout(resolve, LENTIDAO_MS))
    }
    await route.continue()
  })

  const inicioExclusao = Date.now()
  await page.getByRole('button', { name: /Remover tarefa: Tarefa demorada/ }).click()
  await linha('Tarefa demorada').waitFor({ state: 'detached', timeout: LIMITE_OTIMISTA_MS })
  const msExclusao = Date.now() - inicioExclusao
  check('excluir sai da tela sem esperar o servidor', true, `${msExclusao}ms de ${LENTIDAO_MS}ms`)

  await aguardaConfirmacao('Tarefa excluída.')
  check('excluir confirma no aviso', true)
  await page.unroute('**/tasks/*')

  // 3. Editar: o novo título aparece sem esperar a resposta.
  await composer.fill('Titulo antigo')
  await composer.press('Enter')
  await linha('Titulo antigo').waitFor({ timeout: 10_000 })

  await page.route('**/tasks/*', async (route) => {
    if (route.request().method() === 'PATCH') {
      await new Promise((resolve) => setTimeout(resolve, LENTIDAO_MS))
    }
    await route.continue()
  })

  const inicioEdicao = Date.now()
  await page.getByRole('button', { name: 'Titulo antigo', exact: true }).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Titulo novo')
  await page.keyboard.press('Enter')
  await linha('Titulo novo').waitFor({ timeout: LIMITE_OTIMISTA_MS })
  const msEdicao = Date.now() - inicioEdicao
  check('editar aplica sem esperar o servidor', true, `${msEdicao}ms de ${LENTIDAO_MS}ms`)

  await aguardaConfirmacao('Alteração salva.')
  check('editar confirma no aviso', true)

  await page.unroute('**/tasks/*')
  await page.waitForTimeout(400)

  // 4. Quando a escrita otimista falha, desfazer sozinho não basta: sem aviso, a pessoa
  //    veria a tarefa reaparecer do nada e concluiria que o app perdeu o trabalho dela.
  await page.route('**/tasks/*', async (route) => {
    if (route.request().method() === 'DELETE') return route.abort('failed')
    await route.continue()
  })

  await page.getByRole('button', { name: /Remover tarefa: Titulo novo/ }).click()

  // O aviso tem duas linhas: o título diz qual ação falhou, a segunda linha traz o que
  // o servidor respondeu. Antes a mensagem da API substituía a nossa, e sobrava só
  // "não foi possível falar com o servidor" — sem dizer o que tinha se perdido.
  await falhas.getByText('Não consegui excluir a tarefa.').waitFor({ timeout: 5000 })
  const detalheDaFalha = (await falhas.innerText()).trim()
  check(
    'a falha diz a ação e o motivo, em duas linhas',
    /servidor/i.test(detalheDaFalha),
    JSON.stringify(detalheDaFalha.replace(/\n/g, ' · ')),
  )

  await linha('Titulo novo').waitFor({ timeout: 5000 })
  check('falha ao excluir devolve a tarefa à lista', true)
  await page.screenshot({ path: `${outDir}/02-falha.png` })
  await page.unroute('**/tasks/*')

  // 5. Concluir é a ação mais repetida do app: avisos idênticos seguidos precisam
  //    virar um só com contador, senão marcar várias tarefas empilha a tela de avisos.
  for (const titulo of ['Primeira', 'Segunda', 'Terceira']) {
    await composer.fill(titulo)
    await composer.press('Enter')
    await linha(titulo).waitFor({ timeout: 10_000 })
  }
  await confirmacoes.getByRole('button', { name: 'Dispensar aviso' }).first().click()

  for (const titulo of ['Primeira', 'Segunda', 'Terceira']) {
    // Clique, não `check()`: concluída, a tarefa sai da lista padrão, então não há
    // caixa marcada para o Playwright conferir depois.
    await page.getByRole('checkbox', { name: `Concluir ${titulo}` }).click()
    await linha(titulo).waitFor({ state: 'detached', timeout: 5000 })
  }

  const agrupado = confirmacoes.getByText('Tarefa concluída.')
  await agrupado.waitFor({ timeout: 5000 })
  const caixas = await confirmacoes.getByText('Tarefa concluída.').count()
  const contador = (await confirmacoes.innerText()).includes('×3')
  check('três conclusões viram um aviso só', caixas === 1, `${caixas} aviso(s)`)
  check('o aviso agrupado mostra o contador', contador, (await confirmacoes.innerText()).trim())
  await page.screenshot({ path: `${outDir}/03-agrupado.png` })
} finally {
  await browser.close()
}

const falhas = results.filter((result) => !result.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
