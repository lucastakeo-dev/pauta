/**
 * Fumaça do fluxo de entrada, com navegador de verdade.
 *
 * Não substitui os testes da API — cobre o que só aparece no browser: se o bundle
 * carrega, se a guarda de rota redireciona, se o formulário fala com a API e se a
 * sessão sobrevive ao reload.
 *
 * Uso: node scripts/smoke.mjs [diretorio-de-saida]
 * Requer web em :5176 e API em :3334.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const WEB = 'http://localhost:5176'
const outDir = process.argv[2] ?? 'smoke-out'
const results = []

function check(name, passed, detail = '') {
  results.push({ name, passed, detail })
  console.log(`${passed ? 'OK  ' : 'FALHA'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
})

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

const consoleErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(String(error)))

// Guardamos a URL de cada resposta com falha: o texto do console diz só "404",
// o que não ajuda a achar o culpado.
const failedRequests = []
page.on('response', (response) => {
  if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`)
})

mkdirSync(outDir, { recursive: true })

try {
  // 1. A raiz é pública: visitante anônimo vê a vitrine, não o login.
  await page.goto(WEB, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /O seu dia inteiro/ }).waitFor({ timeout: 10_000 })
  check('a raiz mostra a vitrine para quem não entrou', true)

  // 2. Área logada sem sessão manda para o login.
  await page.goto(`${WEB}/today`, { waitUntil: 'networkidle' })
  check('/today exige login', page.url().includes('/signin'), page.url())
  await page.screenshot({ path: `${outDir}/01-login.png` })

  // 3. Validação no cliente, antes de qualquer viagem de rede.
  await page.getByLabel('E-mail').fill('nao-e-email')
  await page.getByLabel('Senha').fill('123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  const erroVisivel = await page.getByText('Informe um e-mail válido.').isVisible()
  check('valida e-mail inválido no cliente', erroVisivel)
  await page.screenshot({ path: `${outDir}/02-validacao.png` })

  // 4. Cadastro real, batendo na API.
  const email = `smoke-${Date.now()}@exemplo.dev`
  await page.getByRole('link', { name: 'Criar uma' }).click()
  await page.waitForURL((url) => url.pathname === '/signup', { timeout: 10_000 })
  await page.getByLabel('Nome').fill('Takeo Smoke')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()

  await page.waitForURL((url) => url.pathname === '/today', { timeout: 10_000 })
  await page.getByRole('heading', { name: 'Tarefas' }).waitFor({ timeout: 10_000 })
  check('cadastro entra direto no app', true, page.url())
  await page.screenshot({ path: `${outDir}/03-logado.png` })

  // 5. A sessão sobrevive ao reload (token persistido + /auth/me).
  await page.reload({ waitUntil: 'networkidle' })
  const continuaLogado = await page.getByRole('heading', { name: 'Tarefas' }).isVisible()
  check('sessão sobrevive ao reload', continuaLogado, page.url())

  // 6. A moldura: trilho, painel, e o painel recolhendo sem levar a navegação junto.
  const barra = page.locator('aside')
  const trilho = page.getByRole('navigation', { name: 'Seções', exact: true })
  // Dentro da barra: a grade também tem um título "Hoje", e é outro elemento.
  const painel = barra.getByRole('heading', { name: 'Hoje', exact: true })

  check(
    'trilho e painel são uma região só',
    (await barra.count()) === 1 && (await trilho.count()) === 1,
  )

  // O painel nomeia a seção em vez de repetir os destinos: cada destino aparece uma
  // vez só na barra inteira, e é no trilho.
  // Contado contra o próprio trilho, e não contra um número escrito aqui: um destino
  // novo no app não deve derrubar um teste que fala de espelhamento.
  const noTrilho = await trilho.locator('a').count()
  const naBarra = await barra.locator('a').count()
  check(
    'o painel não espelha os destinos do trilho',
    naBarra === noTrilho,
    `${naBarra} na barra, ${noTrilho} no trilho`,
  )
  check('o painel nomeia a seção em que se está', await painel.isVisible())

  const larguraAberto = Math.round((await barra.boundingBox()).width)
  await page.getByRole('button', { name: 'Recolher o menu' }).click()
  await painel.waitFor({ state: 'detached', timeout: 5000 })
  const larguraRecolhido = Math.round((await barra.boundingBox()).width)

  check(
    'recolher o menu devolve a largura à tela',
    larguraRecolhido < larguraAberto / 4,
    `${larguraAberto}px → ${larguraRecolhido}px`,
  )
  // É isto que paga a repetição dos destinos: recolhido, ainda dá para navegar.
  check(
    'recolhido, o trilho continua navegando',
    await trilho.getByRole('link', { name: 'Notas' }).isVisible(),
  )
  await page.screenshot({ path: `${outDir}/04-recolhido.png` })

  await page.reload({ waitUntil: 'networkidle' })
  await trilho.waitFor({ timeout: 10_000 })
  check('o menu recolhido continua recolhido depois de recarregar', (await painel.count()) === 0)

  await page.getByRole('button', { name: 'Expandir o menu' }).click()
  await painel.waitFor({ timeout: 5000 })
  check('expandir traz o menu de volta', true)

  // 7. O tema claro, e a memória dele.
  const temaDe = () => page.evaluate(() => document.documentElement.className)
  const fundoDoPainel = () =>
    page.evaluate(
      () => getComputedStyle(document.querySelector('aside').children[1]).backgroundColor,
    )

  check('o app abre no escuro', (await temaDe()) === 'dark', await temaDe())
  const fundoEscuro = await fundoDoPainel()

  await page.getByRole('button', { name: 'Conta', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tema claro' }).click()
  await page.waitForFunction(() => document.documentElement.classList.contains('light'), {
    timeout: 5000,
  })

  const fundoClaro = await fundoDoPainel()
  check(
    'trocar o tema repinta o painel',
    fundoClaro !== fundoEscuro,
    `${fundoEscuro} → ${fundoClaro}`,
  )

  // `color-scheme` acompanha o tema — é ele que pinta barra de rolagem e campos nativos.
  const esquema = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)
  check('color-scheme acompanha o tema', esquema === 'light', esquema)

  // O script embutido no index.html aplica antes do primeiro pixel: depois do reload a
  // classe já tem de estar lá, sem passar pelo escuro.
  await page.reload({ waitUntil: 'networkidle' })
  check('o tema escolhido sobrevive ao recarregar', (await temaDe()) === 'light', await temaDe())
  await page.screenshot({ path: `${outDir}/05-claro.png` })

  await page.getByRole('button', { name: 'Conta', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tema escuro' }).click()
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'), {
    timeout: 5000,
  })
  check('dá para voltar ao escuro', true)

  // 7b. A cor principal: troca o acento do app inteiro e é lembrada.
  //     O avatar é a sonda — ele é pintado com o token do acento.
  const acentoDoAvatar = () =>
    page.evaluate(
      () => getComputedStyle(document.querySelector('[aria-label="Conta"]')).backgroundColor,
    )

  const roxo = await acentoDoAvatar()

  await page.getByRole('button', { name: 'Conta', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Cor principal' }).click()
  await page.getByRole('menuitem', { name: 'Laranja' }).click()
  await page.waitForFunction(() => document.documentElement.classList.contains('accent-laranja'), {
    timeout: 5000,
  })
  await page.keyboard.press('Escape')

  const laranja = await acentoDoAvatar()
  check('trocar a cor principal repinta o acento', laranja !== roxo, `${roxo} → ${laranja}`)

  // O tema continua sendo o que era: cor e tema são escolhas separadas.
  check(
    'trocar a cor não mexe no tema',
    await page.evaluate(() => document.documentElement.classList.contains('dark')),
  )

  await page.reload({ waitUntil: 'networkidle' })
  await trilho.waitFor({ timeout: 10_000 })
  check(
    'a cor escolhida sobrevive ao recarregar',
    await page.evaluate(() => document.documentElement.classList.contains('accent-laranja')),
  )
  await page.screenshot({ path: `${outDir}/06-cor.png` })

  // 7c. O rodapé: o que espera, o estado da escrita e a porta do Agent.
  const rodape = page.getByRole('contentinfo', { name: 'Estado do app' })
  await rodape.waitFor({ timeout: 10_000 })

  // Uma tarefa é criada mais abaixo no roteiro; aqui a conta é a da inbox vazia, então
  // o que se prova é o estado da escrita, que existe sempre.
  const textoRodape = await rodape.innerText()
  check(
    'o rodapé diz o estado da escrita',
    /salvo|salvando|carregando/i.test(textoRodape),
    textoRodape.replace(/\n/g, ' · '),
  )

  await rodape.getByRole('button', { name: 'Agent' }).click()
  const agente = page.getByRole('region', { name: 'Agent' })
  await agente.waitFor({ timeout: 5000 })
  check('o rodapé abre o Agent', true)

  await agente.getByRole('button', { name: 'Fechar o Agent' }).click()
  await agente.waitFor({ state: 'detached', timeout: 5000 })

  // O atalho abre o mesmo painel — é o caminho de quem não tira as mãos do teclado.
  await page.keyboard.press('Control+j')
  await agente.waitFor({ timeout: 5000 })
  check('⌘J abre o Agent', true)
  await page.screenshot({ path: `${outDir}/07-agent.png` })

  await page.keyboard.press('Control+j')
  await agente.waitFor({ state: 'detached', timeout: 5000 })
  check('e fecha com o mesmo atalho', true)

  // 8. Sair volta ao login, e a área logada volta a ser barrada.
  //    Sair mora no menu da conta, na barra lateral — não mais solto numa faixa no topo.
  await page.getByRole('button', { name: 'Conta', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await page.waitForURL((url) => url.pathname.includes('/signin'), { timeout: 10_000 })

  await page.goto(`${WEB}/today`, { waitUntil: 'networkidle' })
  check('após sair, /today volta a exigir login', page.url().includes('/signin'), page.url())

  // 9. Com sessão, a vitrine não faz sentido: a raiz manda para o app.
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/today', { timeout: 10_000 })

  await page.goto(WEB, { waitUntil: 'networkidle' })
  await page.waitForURL((url) => url.pathname === '/today', { timeout: 10_000 })
  check('quem já tem sessão pula a vitrine', true, page.url())

  await page.screenshot({ path: `${outDir}/04-deslogado.png` })

  check(
    'sem erros no console',
    consoleErrors.length === 0,
    [...consoleErrors.slice(0, 3), ...failedRequests.slice(0, 3)].join(' | '),
  )
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
