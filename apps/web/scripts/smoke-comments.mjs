/**
 * Fumaça dos comentários, com navegador de verdade.
 *
 * O que se verifica é a promessa da seção: o comentário vai para o servidor com o texto
 * que foi digitado, a conversa se lê em ordem, editar marca a edição sem duplicar a
 * linha, excluir tira só aquele, e o histórico é da tarefa — abrir outra não mostra o
 * mesmo texto.
 *
 * Uso: node scripts/smoke-comments.mjs [diretorio-de-saida]
 * Requer web em :5176 e API em :3334.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const API = 'http://localhost:3334'
const WEB = 'http://localhost:5176'
const outDir = process.argv[2] ?? 'smoke-comments-out'
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
  const email = `comments-${Date.now()}@exemplo.dev`
  const registro = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Ana Paula', email, password: 'senha-bem-segura' }),
  }).then((r) => r.json())

  const auth = { authorization: `Bearer ${registro.token}`, 'content-type': 'application/json' }
  const post = (rota, body) =>
    fetch(`${API}${rota}`, { method: 'POST', headers: auth, body: JSON.stringify(body) }).then(
      (r) => r.json(),
    )
  const comentarios = (taskId) =>
    fetch(`${API}/tasks/${taskId}/comments`, { headers: auth }).then((r) => r.json())

  /** Espera o servidor refletir a escrita — a tela muda antes da resposta chegar. */
  const esperarComentarios = async (taskId, condicao, prazo = 10_000) => {
    const limite = Date.now() + prazo
    let ultima = []

    while (Date.now() < limite) {
      ultima = await comentarios(taskId)
      if (condicao(ultima)) return ultima
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    return ultima
  }

  const alvo = await post('/tasks', { title: 'Publicar a landing', status: 'inbox' })
  const vizinha = await post('/tasks', { title: 'Revisar o contrato', status: 'inbox' })
  // Fora da fila, para chegar nela pela lista de tarefas — é o outro caminho até a
  // mesma conversa, e o que prova que o modal não é uma segunda implementação.
  const naLista = await post('/tasks', { title: 'Fechar o mês', status: 'todo' })

  await page.goto(`${WEB}/signin`, { waitUntil: 'networkidle' })
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/today', { timeout: 10_000 })

  await page.goto(`${WEB}/inbox`, { waitUntil: 'networkidle' })

  const barra = page.locator('aside')
  const principal = page.locator('main')
  const fila = (titulo) => barra.getByRole('button', { name: `Abrir: ${titulo}`, exact: true })
  const conversa = principal.getByRole('region', { name: 'Comentários' })
  const caixaNova = principal.getByLabel('Novo comentário')

  const abertoAgora = (titulo) =>
    page.waitForFunction(
      (esperado) => document.querySelector('main input')?.value === esperado,
      titulo,
      { timeout: 10_000 },
    )

  await fila('Publicar a landing').click()
  await abertoAgora('Publicar a landing')

  // 1. A seção existe na tarefa aberta, e começa sem conversa nenhuma.
  await caixaNova.waitFor({ timeout: 10_000 })
  check('a tarefa aberta tem onde comentar', true)
  check('a conversa começa vazia', (await comentarios(alvo.id)).length === 0)

  // 2. Publicar leva o texto para o servidor. ⌘↵ é o caminho anunciado ao lado do
  //    botão: se ele não publicar, o atalho está mentindo na tela.
  await caixaNova.fill('Cliente adiou para a semana que vem.')
  await page.keyboard.press('Control+Enter')

  const publicados = await esperarComentarios(alvo.id, (lista) => lista.length === 1)
  check(
    'o atalho publica o comentário',
    publicados[0]?.body === 'Cliente adiou para a semana que vem.',
    publicados[0]?.body ?? 'nenhum',
  )
  check('o comentário nasce sem marca de edição', publicados[0]?.editedAt === null)

  // A caixa esvazia sozinha: quem comenta costuma escrever em sequência.
  await page.waitForFunction(
    () => document.querySelector('main textarea[aria-label="Novo comentário"]')?.value === '',
    { timeout: 5_000 },
  )
  check('a caixa esvazia depois de publicar', true)

  // 3. O botão publica igual ao atalho, e a ordem é a da escrita.
  await caixaNova.fill('Falei com o financeiro, liberado.')
  await conversa.getByRole('button', { name: 'Comentar', exact: true }).click()

  const dois = await esperarComentarios(alvo.id, (lista) => lista.length === 2)
  check(
    'a conversa se lê do mais antigo para o mais novo',
    dois[0].body.startsWith('Cliente adiou') && dois[1].body.startsWith('Falei com'),
    dois.map((c) => c.body.slice(0, 14)).join(' | '),
  )

  await conversa.getByText('Falei com o financeiro, liberado.').waitFor({ timeout: 10_000 })
  check('os dois comentários aparecem na tela', true)

  // O autor aparece com nome e iniciais — é o que separa uma conversa de uma lista de
  // frases soltas.
  const autores = await conversa.getByText('Ana Paula').count()
  check('cada comentário mostra quem escreveu', autores === 2, `${autores} assinaturas`)
  await page.screenshot({ path: `${outDir}/01-conversa.png` })

  // 4. Editar reescreve aquele comentário e carimba a edição — sem criar um segundo.
  await conversa.getByText('Cliente adiou para a semana que vem.').hover()
  await conversa.getByRole('button', { name: 'Editar', exact: true }).first().click()

  const caixaEdicao = principal.getByLabel('Editando o comentário')
  await caixaEdicao.waitFor({ timeout: 10_000 })
  await caixaEdicao.fill('Cliente adiou para o dia 20.')
  await conversa.getByRole('button', { name: 'Salvar', exact: true }).click()

  const editados = await esperarComentarios(alvo.id, (lista) => lista[0]?.editedAt !== null)
  check(
    'editar reescreve o comentário sem duplicar',
    editados.length === 2 && editados[0].body === 'Cliente adiou para o dia 20.',
    `${editados.length} comentários`,
  )
  await conversa.getByText('editado').first().waitFor({ timeout: 10_000 })
  check('a edição fica visível na conversa', true)

  // 5. A conversa é da tarefa: a vizinha não herda nada.
  await fila('Revisar o contrato').click()
  await abertoAgora('Revisar o contrato')
  await caixaNova.waitFor({ timeout: 10_000 })

  const naVizinha = await conversa.getByText(/Cliente adiou|Falei com/).count()
  check('a conversa não vaza para outra tarefa', naVizinha === 0, `${naVizinha} vazamentos`)
  check('e a vizinha continua sem comentários', (await comentarios(vizinha.id)).length === 0)

  // 6. Excluir tira só aquele comentário.
  await fila('Publicar a landing').click()
  await abertoAgora('Publicar a landing')
  await conversa.getByText('Falei com o financeiro, liberado.').waitFor({ timeout: 10_000 })

  await conversa.getByText('Falei com o financeiro, liberado.').hover()
  await conversa.getByRole('button', { name: 'Excluir comentário' }).last().click()

  const restantes = await esperarComentarios(alvo.id, (lista) => lista.length === 1)
  check(
    'excluir tira só o comentário escolhido',
    restantes.length === 1 && restantes[0].body === 'Cliente adiou para o dia 20.',
    restantes.map((c) => c.body).join(' | '),
  )

  // 7. O histórico sobrevive ao recarregamento — é para isso que ele existe.
  await page.reload({ waitUntil: 'networkidle' })
  await fila('Publicar a landing').click()
  await abertoAgora('Publicar a landing')
  await conversa.getByText('Cliente adiou para o dia 20.').waitFor({ timeout: 10_000 })
  check('a conversa continua lá depois de recarregar', true)
  await page.screenshot({ path: `${outDir}/02-depois-do-reload.png` })

  // 8. O modal comenta pelo mesmo caminho: é o mesmo componente, e é o que garante que
  //    abrir a tarefa pela lista não dê uma conversa de segunda categoria.
  await page.goto(`${WEB}/today`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Fechar o mês', exact: true }).first().click()

  const modal = page.getByRole('dialog')
  await modal.waitFor({ timeout: 10_000 })

  const caixaDoModal = modal.getByLabel('Novo comentário')
  await caixaDoModal.waitFor({ timeout: 10_000 })
  await caixaDoModal.fill('Boletos conferidos.')
  await modal.getByRole('button', { name: 'Comentar', exact: true }).click()

  const doModal = await esperarComentarios(naLista.id, (lista) => lista.length === 1)
  check(
    'o modal da tarefa comenta na mesma conversa',
    doModal[0]?.body === 'Boletos conferidos.',
    doModal[0]?.body ?? 'nenhum',
  )
  await modal.getByText('Boletos conferidos.').waitFor({ timeout: 10_000 })
  await page.screenshot({ path: `${outDir}/03-modal.png` })

  check('nenhum erro no console', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
