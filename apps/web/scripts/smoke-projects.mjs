/**
 * Fumaça da árvore de projetos, com navegador de verdade.
 *
 * O que se verifica aqui não é o CRUD — isso os testes da API já cobrem — e sim que a
 * hierarquia chega inteira à tela: recuo por nível, contador que soma a subárvore ao
 * recolher, trilha de navegação e as abas da página do projeto.
 *
 * Uso: node scripts/smoke-projects.mjs [diretorio-de-saida]
 * Requer web em :5176 e API em :3334.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const API = 'http://localhost:3334'
const WEB = 'http://localhost:5176'
const outDir = process.argv[2] ?? 'smoke-projects-out'
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
  const email = `proj-${Date.now()}@exemplo.dev`
  const registro = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Takeo Smoke', email, password: 'senha-bem-segura' }),
  }).then((r) => r.json())

  const auth = { authorization: `Bearer ${registro.token}`, 'content-type': 'application/json' }
  const criar = (body) =>
    fetch(`${API}/projects`, { method: 'POST', headers: auth, body: JSON.stringify(body) }).then(
      (r) => r.json(),
    )

  const trabalho = await criar({ name: 'Trabalho' })
  const plataforma = await criar({ name: 'Plataforma', parentId: trabalho.id })
  await criar({ name: 'Fase 1', parentId: plataforma.id })
  await criar({ name: 'Pessoal' })

  // Uma tarefa no neto: é ela que prova a soma da subárvore.
  await fetch(`${API}/tasks`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ title: 'Tarefa funda', projectId: plataforma.id }),
  })

  await page.goto(`${WEB}/signin`, { waitUntil: 'networkidle' })
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/today', { timeout: 10_000 })

  // 1. A árvore aparece na barra, aninhada.
  await page.getByRole('link', { name: 'Projetos' }).click()
  await page.waitForURL((url) => url.pathname.startsWith('/projects'), { timeout: 10_000 })

  const barra = page.locator('aside')
  const linhaNeto = barra.getByRole('link', { name: /Abrir projeto: Fase 1/ })
  await linhaNeto.waitFor({ timeout: 10_000 })
  check('a árvore mostra os três níveis na barra', true)

  // Mede onde o nome cai na tela, não a técnica usada para recuar: o que precisa ser
  // verdade é que a pessoa vê os níveis alinhados entre si e escalonados entre níveis.
  const x = async (nome) => {
    const caixa = await barra
      .getByRole('link', { name: new RegExp(`Abrir projeto: ${nome}$`) })
      .boundingBox()
    return Math.round(caixa.x)
  }

  const [raizA, raizB, filho, neto] = await Promise.all([
    x('Trabalho'),
    x('Pessoal'),
    x('Plataforma'),
    x('Fase 1'),
  ])

  check(
    'irmãos do mesmo nível começam na mesma coluna',
    raizA === raizB,
    `Trabalho ${raizA}px, Pessoal ${raizB}px`,
  )
  check(
    'cada nível recua mais que o anterior',
    neto > filho && filho > raizA,
    `${raizA} → ${filho} → ${neto}`,
  )
  await page.screenshot({ path: `${outDir}/01-arvore.png` })

  // 2. Recolher esconde os filhos e passa a somar a subárvore no contador.
  const recolher = barra.getByRole('button', { name: /Recolher: Trabalho/ })
  await recolher.click()
  await linhaNeto.waitFor({ state: 'detached', timeout: 5000 })
  check('recolher esconde a subárvore', true)

  const linhaPai = barra.getByRole('link', { name: /Abrir projeto: Trabalho/ })

  // O clique deixa o ponteiro sobre a linha, e com ela sob o mouse o contador dá lugar
  // ao `+`. Afastar antes de ler é o que separa "não apareceu" de "está escondido".
  await page.mouse.move(0, 0)
  const textoRecolhido = await linhaPai.innerText()
  check(
    'recolhido, o contador soma a subárvore',
    textoRecolhido.includes('1'),
    JSON.stringify(textoRecolhido.replace(/\n/g, ' ')),
  )

  // E o inverso: sob o mouse, a ponta da linha passa a ser do botão de criar dentro.
  await linhaPai.hover()
  const criarDentro = barra.getByRole('button', { name: 'Novo subprojeto' }).first()
  check('sob o mouse, a linha oferece criar um subprojeto', await criarDentro.isVisible())
  await page.mouse.move(0, 0)

  // Recolhido continua recolhido depois de trocar de tela e de recarregar: a árvore é
  // remontada a cada navegação, e sem persistir isso tudo voltaria aberto.
  await page.getByRole('link', { name: 'Hoje' }).click()
  await page.waitForURL((url) => url.pathname === '/today', { timeout: 10_000 })
  await page.getByRole('link', { name: 'Projetos' }).click()
  await page.waitForURL((url) => url.pathname.startsWith('/projects'), { timeout: 10_000 })
  await barra.getByRole('button', { name: /Expandir: Trabalho/ }).waitFor({ timeout: 5000 })
  check('o que foi recolhido segue recolhido ao trocar de tela', true)

  await page.reload({ waitUntil: 'networkidle' })
  await barra.getByRole('button', { name: /Expandir: Trabalho/ }).waitFor({ timeout: 10_000 })
  check('e continua recolhido depois de recarregar', true)

  await barra.getByRole('button', { name: /Expandir: Trabalho/ }).click()
  await linhaNeto.waitFor({ timeout: 5000 })
  check('expandir traz a subárvore de volta', true)

  // 3. A página do projeto: trilha, abas e a lista filtrada.
  await barra.getByRole('link', { name: /Abrir projeto: Plataforma/ }).click()
  await page.getByRole('heading', { name: 'Plataforma' }).waitFor({ timeout: 10_000 })

  const trilha = page.getByRole('navigation', { name: 'Trilha de navegação' })
  const textoTrilha = await trilha.innerText()
  check(
    'a trilha mostra o caminho até a raiz',
    textoTrilha.includes('Projetos') && textoTrilha.includes('Trabalho'),
    JSON.stringify(textoTrilha.replace(/\n/g, ' ')),
  )

  await page.getByRole('button', { name: 'Tarefas' }).click()
  await page.getByRole('listitem').filter({ hasText: 'Tarefa funda' }).first().waitFor({
    timeout: 10_000,
  })
  check('a aba Tarefas lista só as do projeto', true)
  await page.screenshot({ path: `${outDir}/02-projeto.png` })

  await page.getByRole('button', { name: 'Visão geral' }).click()
  await page.getByRole('heading', { name: 'Subprojetos' }).waitFor({ timeout: 5000 })
  check('a aba Visão geral volta ao resumo', true)

  // 4. O índice lista a árvore inteira, com recuo.
  await page.getByRole('link', { name: 'Projetos', exact: true }).first().click()
  await page.waitForURL((url) => url.pathname === '/projects', { timeout: 10_000 })
  const linhas = await page.locator('main a[href^="/projects/"]').count()
  check('o índice lista todos os projetos', linhas === 4, `${linhas} de 4`)
  await page.screenshot({ path: `${outDir}/03-indice.png` })
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
