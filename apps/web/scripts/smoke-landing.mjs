/**
 * Fumaça da vitrine.
 *
 * Página estática não tem lógica para testar em unidade — o que importa aqui é o que só
 * o navegador mostra: as seções renderizam, a navegação âncora funciona, os CTAs levam
 * ao lugar certo, e a página não estoura na horizontal em tela pequena.
 *
 * Uso: node scripts/smoke-landing.mjs [diretorio-de-saida]
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
  await page.goto(WEB, { waitUntil: 'networkidle' })

  // 1. As cinco seções existem.
  for (const titulo of [
    /Planejar o dia/,
    /O que existe/,
    /Fronteiras que/,
    /A biblioteca errava/,
    /Escolhas/,
  ]) {
    await page.getByRole('heading', { name: titulo }).first().waitFor({ timeout: 10_000 })
  }
  check('as cinco seções renderizam', true)

  // 2. Os números são os reais do projeto.
  const corpo = await page.textContent('body')
  check('mostra os números do projeto', corpo.includes('293') && corpo.includes('testes'))

  // 3. A seção da arquitetura traz a saída real do lint.
  check(
    'a arquitetura mostra a mensagem real do lint',
    corpo.includes('só models/ acessa o Prisma'),
  )

  // 4. A comparação do parser mostra o erro do chrono.
  check('o parser mostra o caso do chrono', corpo.includes('almoço amanhã 13h'))

  await page.screenshot({ path: `${outDir}/01-topo.png` })

  // 5. Navegação por âncora rola a página.
  const antes = await page.evaluate(() => window.scrollY)
  await page.getByRole('link', { name: 'Arquitetura' }).click()
  await page.waitForTimeout(900)
  const depois = await page.evaluate(() => window.scrollY)
  check('a navegação por âncora rola', depois > antes, `${antes} → ${Math.round(depois)}`)

  // 6. O CTA leva ao login.
  await page.getByRole('link', { name: 'Entrar', exact: true }).first().click()
  await page.waitForURL((url) => url.pathname === '/login', { timeout: 10_000 })
  check('o CTA leva ao login', true)

  // 7. Sem rolagem horizontal — o erro mais comum em página de display grande.
  await page.goto(WEB, { waitUntil: 'networkidle' })
  for (const largura of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width: largura, height: 900 })
    await page.waitForTimeout(400)

    const estoura = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    )
    check(`sem rolagem horizontal em ${largura}px`, !estoura)
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${outDir}/02-mobile.png` })

  check('sem erros no console', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}

const falhas = results.filter((r) => !r.passed)
console.log(`\n${results.length - falhas.length}/${results.length} verificações passaram`)
console.log(`capturas em ${outDir}/`)
process.exit(falhas.length === 0 ? 0 : 1)
