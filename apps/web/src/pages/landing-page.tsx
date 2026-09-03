import { ClosingSection } from '../features/landing/closing-section.js'
import { Hero } from '../features/landing/hero.js'
import { KeyboardSection } from '../features/landing/keyboard-section.js'
import { LandingNav } from '../features/landing/landing-nav.js'
import { ModulesSection } from '../features/landing/modules-section.js'
import { RoutineSection } from '../features/landing/routine-section.js'

/**
 * A vitrine.
 *
 * Tema claro, ao contrário do app: são públicos diferentes — esta página é lida uma vez,
 * de passagem, enquanto a ferramenta fica aberta o dia inteiro.
 *
 * O conteúdo fala do produto, e não de como ele foi construído. A versão anterior
 * mostrava arquitetura, parser e stack: era honesta e interessante, mas respondia a
 * perguntas que só se faz depois de decidir usar. Quem chega quer saber o que resolve na
 * terça-feira dele; o resto está no repositório, a um clique de qualquer tela daqui.
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
      <RoutineSection />
      <KeyboardSection />
      <ClosingSection />
    </div>
  )
}
