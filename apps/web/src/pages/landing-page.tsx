import { ArchitectureSection } from '../features/landing/architecture-section.js'
import { Hero } from '../features/landing/hero.js'
import { LandingNav } from '../features/landing/landing-nav.js'
import { ModulesSection } from '../features/landing/modules-section.js'
import { ParserSection } from '../features/landing/parser-section.js'
import { StackSection } from '../features/landing/stack-section.js'

/**
 * A vitrine.
 *
 * Tema claro, ao contrário do app: são públicos diferentes — esta página é lida uma vez,
 * de passagem, enquanto a ferramenta fica aberta o dia inteiro.
 *
 * O conteúdo é técnico de propósito. Não é um produto à venda: é uma ferramenta pessoal
 * de código aberto, e o que ela tem de interessante são as decisões, não a promessa.
 */
export function LandingPage() {
  return (
    <div className="landing min-h-dvh">
      <LandingNav />

      {/* A grade fina só no topo: acompanha o herói e some antes do conteúdo denso. */}
      <div className="landing-grid">
        <Hero />
      </div>

      <ModulesSection />
      <ArchitectureSection />
      <ParserSection />
      <StackSection />
    </div>
  )
}
