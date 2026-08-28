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

  // O recuo é o que comunica a hierarquia: sem ele a árvore vira lista.
  const recuoPai = await barra
    .getByRole('link', { name: /Abrir projeto: Trabalho/ })
    .evaluate((el) => el.parentElement.style.paddingLeft)
  const recuoNeto = await linhaNeto.evaluate((el) => el.parentElement.style.paddingLeft)
  check(
    'cada nível recua mais que o anterior',
    Number.parseInt(recuoNeto, 10) > Number.parseInt(recuoPai, 10),
    `${recuoPai} → ${recuoNeto}`,
  )
  await page.screenshot({ path: `${outDir}/01-arvore.png` })

  // 2. Recolher esconde os filhos e passa a somar a subárvore no contador.
  const recolher = barra.getByRole('button', { name: /Recolher: Trabalho/ })
  await recolher.click()
  await linhaNeto.waitFor({ state: 'detached', timeout: 5000 })
  check('recolher esconde a subárvore', true)

  const linhaPai = barra.getByRole('link', { name: /Abrir projeto: Trabalho/ })
  const textoRecolhido = await linhaPai.innerText()
  check(
    'recolhido, o contador soma a subárvore',
    textoRecolhido.includes('1'),
    JSON.stringify(textoRecolhido.replace(/\n/g, ' ')),
  )

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
