/**
 * Fumaça das notas: nota do dia, autosave, `[[links]]` e backlinks na tela.
 *
 * O autosave é o ponto delicado — só o navegador prova que o que foi digitado chegou
 * ao servidor, e que o cursor não é jogado para o início a cada salvamento.
 *
 * Uso: node scripts/smoke-notes.mjs [diretorio-de-saida]
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
  const email = `notas-${Date.now()}@exemplo.dev`
  const registro = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Takeo', email, password: 'senha-bem-segura' }),
  }).then((r) => r.json())

  const auth = { authorization: `Bearer ${registro.token}` }
  const notas = () => fetch(`${API}/notes`, { headers: auth }).then((r) => r.json())

  /**
   * Espera o servidor conter o texto.
   *
   * Esperar o indicador "salvo" na tela não basta: o autosave dispara a cada pausa,
   * então o indicador pode refletir um salvamento parcial do meio da digitação.
   * Quem decide é a API, que é o que a verificação afirma.
   */
  async function aguardarNoServidor(trecho, tentativas = 20) {
    for (let i = 0; i < tentativas; i++) {
      const lista = await notas()
      const diaria = lista.find((n) => n.dailyOn !== null)

      if (diaria) {
        const d = await fetch(`${API}/notes/${diaria.id}`, { headers: auth }).then((r) => r.json())
        if (JSON.stringify(d.contentJson).includes(trecho)) return d
      }

      await page.waitForTimeout(250)
    }

    return null
  }

  await page.goto(`${WEB}/signin`, { waitUntil: 'networkidle' })
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill('senha-bem-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('/signin'), { timeout: 10_000 })

  // 1. Navegar para Notas pelo cabeçalho.
  await page.getByRole('link', { name: 'Notas' }).click()
  await page.waitForURL((url) => url.pathname === '/notes', { timeout: 10_000 })
  check('o cabeçalho leva para as notas', true)

  // 2. A nota do dia abre sozinha, criada na primeira visita.
  const editor = page.getByLabel('Conteúdo da nota')
  await editor.waitFor({ timeout: 10_000 })

  const hoje = new Date()
  const titulo = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`
  await page.getByRole('heading', { name: titulo }).waitFor({ timeout: 10_000 })
  check('abre direto na nota do dia', true, titulo)

  // 3. Autosave: digitar e esperar o "salvo".
  await editor.click()
  await page.keyboard.type('combinar com [[Casa]] hoje')
  await page.getByText('salvo').waitFor({ timeout: 10_000 })
  check('o autosave confirma na tela', true)

  const detalhe = await aguardarNoServidor('combinar com [[Casa]] hoje')
  check('o texto digitado chegou ao servidor', detalhe !== null)

  // 4. O [[link]] virou nota e o backlink apareceu.
  check('o [[link]] criou a nota citada', Boolean(detalhe?.linksTo.some((n) => n.title === 'Casa')))
  await page.getByRole('button', { name: 'Casa', exact: true }).first().waitFor({ timeout: 10_000 })
  check('a nota citada aparece na tela', true)

  await page.screenshot({ path: `${outDir}/01-diaria.png` })

  // 5. Abrir a nota citada mostra o backlink de volta.
  await page.getByRole('button', { name: 'Casa', exact: true }).first().click()
  await page.getByRole('heading', { name: 'Casa' }).waitFor({ timeout: 10_000 })
  await page.getByText('Citada por').waitFor({ timeout: 10_000 })
  check('a nota citada mostra o backlink', true)

  await page.screenshot({ path: `${outDir}/02-backlink.png` })

  // 6. Criar uma página pela barra lateral.
  await page.getByRole('button', { name: 'Nova página' }).click()
  await page.getByLabel('Nova página').fill('Receitas')
  await page.getByLabel('Nova página').press('Enter')
  await page.getByRole('heading', { name: 'Receitas' }).waitFor({ timeout: 10_000 })
  check('cria página pela barra lateral', true)

  // 7. O conteúdo de cada nota é o seu — trocar de nota não vaza texto.
  const conteudoReceitas = await editor.textContent()
  check('a nota nova abre vazia', conteudoReceitas.trim() === '', JSON.stringify(conteudoReceitas))

  // 8. Busca filtra a lista.
  await page.getByLabel('Buscar nota').fill('Rece')
  await page.getByRole('button', { name: 'Receitas', exact: true }).waitFor({ timeout: 10_000 })
  const semCasa = await page.getByRole('button', { name: 'Casa', exact: true }).count()
  check('a busca filtra a lista', semCasa === 0)

  // 9. Autocomplete do [[: digitar abre o menu com as notas existentes.
  //
  // Volta para a nota do dia: a verificação seguinte confere o conteúdo dela no
  // servidor, e o passo anterior tinha deixado "Receitas" aberta.
  await page.getByLabel('Buscar nota').fill('')
  await page.getByRole('button', { name: 'Nota de hoje' }).click()
  await page.getByRole('heading', { name: titulo }).waitFor({ timeout: 10_000 })
  await editor.click()
  await page.keyboard.press('End')
  await page.keyboard.type('ligado a [[Ca')

  const menu = page.getByRole('list', { name: 'Notas sugeridas' })
  await menu.waitFor({ timeout: 10_000 })
  check('digitar [[ abre o menu de sugestões', true)

  const sugestoes = await menu.textContent()
  check('o menu sugere a nota existente', sugestoes.includes('Casa'), sugestoes.trim())

  await page.screenshot({ path: `${outDir}/04-autocomplete.png` })

  // 10. Enter completa o link.
  await page.keyboard.press('Enter')
  await menu.waitFor({ state: 'detached', timeout: 10_000 })

  const textoEditor = await editor.textContent()
  check('Enter completa o link inteiro', textoEditor.includes('[[Casa]]'), textoEditor.trim())

  // 11. O realce pinta o link no editor.
  const realces = await page.locator('.wiki-link').count()
  check('o link aparece realçado no editor', realces > 0, `${realces} realce(s)`)

  // 12. O link completado vale de verdade: vira backlink no servidor.
  const comLink = await aguardarNoServidor('[[Casa]]')
  check('o link completado chega ao servidor', comLink !== null)

  await page.screenshot({ path: `${outDir}/05-final.png` })

  check('sem erros no console', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
