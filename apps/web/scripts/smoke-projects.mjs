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

  const trabalho = await criar({ name: 'Trabalho', icon: 'briefcase', color: '#4FB477' })
  const plataforma = await criar({ name: 'Plataforma', parentId: trabalho.id, icon: 'server' })
  await criar({ name: 'Fase 1', parentId: plataforma.id, icon: 'rocket' })
  // Sem ícone de propósito: é ele que prova o padrão do catálogo.
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

  // O trilho repete os mesmos destinos do menu: sem escopo, o clique é ambíguo.
  const menu = page.locator('nav[aria-label="Seções"]')

  // 1. A árvore aparece na barra, aninhada.
  await menu.getByRole('link', { name: 'Projetos' }).click()
  await page.waitForURL((url) => url.pathname.startsWith('/projects'), { timeout: 10_000 })

  const barra = page.locator('aside')
  const linhaNeto = barra.getByRole('link', { name: /Abrir projeto: Fase 1/ })
  await linhaNeto.waitFor({ timeout: 10_000 })
  check('a árvore mostra os três níveis na barra', true)

  // Mede onde o nome cai na tela, não a técnica usada para recuar: o que precisa ser
  // verdade é que a pessoa vê os níveis alinhados entre si e escalonados entre níveis.
  const x = async (nome) => {
    const caixa = await barra
      .getByRole('link', { name: new RegExp(`^Abrir projeto: ${nome}(,|$)`) })
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
  // Lido do rótulo, e não do texto: é onde o número está associado ao projeto, e é o
  // que alguém com leitor de tela realmente ouve.
  const rotuloRecolhido = await linhaPai.getAttribute('aria-label')
  check('recolhido, o contador soma a subárvore', rotuloRecolhido.includes('1'), rotuloRecolhido)

  // E o inverso: sob o mouse, a ponta da linha passa a ser do botão de criar dentro.
  await linhaPai.hover()
  const criarDentro = barra.getByRole('button', { name: 'Novo subprojeto' }).first()
  check('sob o mouse, a linha oferece criar um subprojeto', await criarDentro.isVisible())

  // Clicar, e não só olhar: um gatilho que aparece mas não abre nada passaria batido
  // por uma verificação de visibilidade — e já passou uma vez.
  await criarDentro.click()
  await page.getByRole('dialog', { name: 'Novo subprojeto' }).waitFor({ timeout: 5000 })
  check('o `+` da linha abre o diálogo', true)
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 5000 })
  await page.mouse.move(0, 0)

  // Recolhido continua recolhido depois de trocar de tela e de recarregar: a árvore é
  // remontada a cada navegação, e sem persistir isso tudo voltaria aberto.
  await menu.getByRole('link', { name: 'Hoje' }).click()
  await page.waitForURL((url) => url.pathname === '/today', { timeout: 10_000 })
  await menu.getByRole('link', { name: 'Projetos' }).click()
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
  await menu.getByRole('link', { name: 'Projetos' }).click()
  await page.waitForURL((url) => url.pathname === '/projects', { timeout: 10_000 })
  const linhas = await page.locator('main a[href^="/projects/"]').count()
  check('o índice lista todos os projetos', linhas === 4, `${linhas} de 4`)
  await page.screenshot({ path: `${outDir}/03-indice.png` })

  // 5. Ícones: a barra desenha o escolhido, e quem não escolheu cai no padrão.
  const iconeDe = async (nome) =>
    (await barra
      .getByRole('link', { name: new RegExp(`^Abrir projeto: ${nome}(,|$)`) })
      .locator('svg')
      .first()
      .getAttribute('class')) ?? ''

  check(
    'a barra desenha o ícone escolhido',
    (await iconeDe('Trabalho')).includes('lucide-briefcase'),
    await iconeDe('Trabalho'),
  )
  check(
    'projeto sem ícone cai no padrão do catálogo',
    (await iconeDe('Pessoal')).includes('lucide-hash'),
    await iconeDe('Pessoal'),
  )

  // Nenhuma bolinha colorida sobrou na barra: era o que a árvore usava antes, e é o
  // que o ícone veio substituir.
  const bolinhas = await barra.locator('span[style*="background-color"]').count()
  check('a barra não tem mais bolinha colorida', bolinhas === 0, `${bolinhas} encontradas`)

  // 5b. O selecionado ganha a barra de acento, e o caminho até ele ganha peso.
  await barra.getByRole('link', { name: /Abrir projeto: Fase 1/ }).click()
  await page.getByRole('heading', { name: 'Fase 1' }).waitFor({ timeout: 10_000 })
  await page.mouse.move(0, 0)

  const linhaDe = (nome) =>
    barra.getByRole('link', { name: new RegExp(`^Abrir projeto: ${nome}(,|$)`) })

  // A barra é um `::before`: é o desenho, não um elemento, então se lê no estilo.
  const barraDoSelecionado = await linhaDe('Fase 1').evaluate((el) => {
    const linha = el.closest('div')
    const antes = getComputedStyle(linha, '::before')
    return { largura: antes.width, cor: antes.backgroundColor }
  })
  check(
    'o item selecionado ganha a barra de acento',
    barraDoSelecionado.largura === '3px',
    JSON.stringify(barraDoSelecionado),
  )

  const pesos = await Promise.all(
    ['Trabalho', 'Plataforma', 'Pessoal'].map((nome) =>
      linhaDe(nome).evaluate((el) => getComputedStyle(el).fontWeight),
    ),
  )
  check(
    'as pastas do caminho ficam em destaque, as de fora não',
    pesos[0] === '500' && pesos[1] === '500' && pesos[2] === '400',
    `Trabalho ${pesos[0]}, Plataforma ${pesos[1]}, Pessoal ${pesos[2]}`,
  )

  // A linha-guia liga os irmãos: é uma borda da lista, não um enfeite por linha.
  const guia = await barra
    .locator('ul ul')
    .first()
    .evaluate((el) => getComputedStyle(el).borderLeftWidth)
  check('a subárvore tem linha-guia', guia === '1px', guia)
  await page.screenshot({ path: `${outDir}/05-selecao.png` })

  await menu.getByRole('link', { name: 'Projetos' }).click()
  await page.waitForURL((url) => url.pathname === '/projects', { timeout: 10_000 })

  // 6. Trocar o ícone pelo menu que aparece sob o mouse.
  await barra.getByRole('link', { name: /Abrir projeto: Trabalho/ }).hover()
  await barra.getByRole('button', { name: /Ações do projeto: Trabalho/ }).click()
  await page.getByRole('menuitem', { name: 'Editar' }).click()
  await page.getByRole('heading', { name: 'Editar projeto' }).waitFor({ timeout: 5000 })
  check('o menu da barra abre a edição', true)

  await page.locator('label:has(input[aria-label="Café"])').click()
  await page.getByRole('button', { name: 'Salvar' }).click()

  const aviso = page.locator('[data-slot="toasts"]')
  await aviso.getByText('Projeto atualizado.').waitFor({ timeout: 5000 })
  check('salvar responde num Toast', true)

  await page.mouse.move(0, 0)
  await page.waitForFunction(
    () => !document.querySelector('aside')?.innerHTML.includes('lucide-briefcase'),
    { timeout: 5000 },
  )
  check('o ícone novo aparece na barra', (await iconeDe('Trabalho')).includes('lucide-coffee'))

  // 7. O ícone é dado, não preferência de navegador: tem de voltar depois do reload.
  await page.reload({ waitUntil: 'networkidle' })
  await barra.getByRole('link', { name: /Abrir projeto: Trabalho/ }).waitFor({ timeout: 10_000 })
  check('o ícone sobrevive ao recarregar', (await iconeDe('Trabalho')).includes('lucide-coffee'))

  // Regressão: o PATCH herdava o `.default()` da cor e repintava o projeto de azul.
  const depois = await fetch(`${API}/projects`, { headers: auth }).then((r) => r.json())
  const cor = depois.find((projeto) => projeto.name === 'Trabalho').color
  check('trocar o ícone não repinta o projeto', cor === '#4FB477', cor)
  await page.screenshot({ path: `${outDir}/04-icones.png` })

  // 8. Arquivar: sai da barra sem levar nada junto, e fica guardado no índice.
  const linhaPessoal = barra.getByRole('link', { name: /Abrir projeto: Pessoal/ })
  await linhaPessoal.hover()
  await barra.getByRole('button', { name: /Ações do projeto: Pessoal/ }).click()
  await page.getByRole('menuitem', { name: 'Arquivar' }).click()
  await linhaPessoal.waitFor({ state: 'detached', timeout: 10_000 })
  check('arquivar tira o projeto da barra', true)

  const arquivadosNaApi = await fetch(`${API}/projects?includeArchived=true`, { headers: auth })
    .then((r) => r.json())
    .then((lista) => lista.filter((projeto) => projeto.archivedAt !== null))
  check(
    'arquivado não é apagado — só sai das listas',
    arquivadosNaApi.length === 1 && arquivadosNaApi[0].name === 'Pessoal',
    `${arquivadosNaApi.length} arquivado(s)`,
  )

  await page.getByRole('heading', { name: 'Arquivados' }).waitFor({ timeout: 10_000 })
  check('o índice guarda os arquivados numa seção própria', true)
  await page.screenshot({ path: `${outDir}/06-arquivados.png` })

  // 9. Restaurar devolve o projeto à barra — arquivar precisa ter volta.
  await page
    .locator('main')
    .getByRole('button', { name: /Ações do projeto: Pessoal/ })
    .click()
  await page.getByRole('menuitem', { name: 'Restaurar' }).click()
  await linhaPessoal.waitFor({ timeout: 10_000 })
  check('restaurar devolve o projeto à barra', true)

  // 10. Excluir pede confirmação, e a confirmação diz o que vai acontecer.
  const linhaTrabalho = barra.getByRole('link', { name: /Abrir projeto: Trabalho/ })
  await linhaTrabalho.hover()
  await barra.getByRole('button', { name: /Ações do projeto: Trabalho/ }).click()
  await page.getByRole('menuitem', { name: 'Excluir' }).click()

  const confirmacao = page.getByRole('dialog', { name: 'Excluir este projeto?' })
  await confirmacao.waitFor({ timeout: 10_000 })
  const explicacao = await confirmacao.innerText()
  check(
    'a confirmação explica o efeito, e não só pergunta',
    explicacao.includes('inbox') && explicacao.includes('raiz'),
    JSON.stringify(explicacao.replace(/\n/g, ' ')),
  )
  await page.screenshot({ path: `${outDir}/07-excluir.png` })

  await confirmacao.getByRole('button', { name: 'Excluir', exact: true }).click()
  await linhaTrabalho.waitFor({ state: 'detached', timeout: 10_000 })
  check('excluir tira o projeto da barra', true)

  // E o que a confirmação prometeu: filhos na raiz, tarefas vivas.
  const sobraram = await fetch(`${API}/projects`, { headers: auth }).then((r) => r.json())
  const promovido = sobraram.find((projeto) => projeto.name === 'Plataforma')
  check(
    'os subprojetos sobem para a raiz',
    promovido?.parentId === null,
    JSON.stringify(promovido?.parentId),
  )

  const tarefas = await fetch(`${API}/tasks`, { headers: auth }).then((r) => r.json())
  const funda = tarefas.find((tarefa) => tarefa.title === 'Tarefa funda')
  check('a tarefa do subprojeto continua viva', funda?.projectId === promovido?.id)
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
