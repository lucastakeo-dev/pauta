import { Link } from '@tanstack/react-router'
import { REPO_URL } from './landing-nav.js'

const COPY = {
  eyebrow: 'Agenda, tarefas e notas — num app só',
  titulo1: 'O seu dia inteiro',
  titulo2: 'numa tela só.',
  descricao:
    'Compromissos, tarefas e anotações no mesmo lugar. Capture em segundos, arraste para a ' +
    'hora e veja o dia se montar — sem trocar de aba e sem tirar as mãos do teclado.',
  entrar: 'Começar agora',
  codigo: 'Ver o código',
}

/**
 * Os quatro pilares, logo abaixo da dobra.
 *
 * Antes havia números do projeto aqui — testes, suítes, módulos. Eram verdadeiros e não
 * respondiam a pergunta de quem chega: *o que eu faço com isto?* Contagem de teste
 * interessa a quem vai ler o código, e essa pessoa clica em "ver o código".
 */
const PILARES = [
  { nome: 'Planner do dia', texto: 'Compromissos e tarefas na mesma linha do tempo' },
  { nome: 'Tarefas', texto: 'Projetos, etiquetas, subtarefas e recorrência' },
  { nome: 'Captura rápida', texto: '⌘K de qualquer tela, com data em português' },
  { nome: 'Notas', texto: 'Nota do dia automática e links entre páginas' },
] as const

export function Hero() {
  return (
    <section id="topo" className="relative overflow-hidden px-6 pt-24 pb-0">
      <div className="mx-auto max-w-6xl">
        <p className="landing-eyebrow">{COPY.eyebrow}</p>

        <h1 className="landing-display mt-8 text-[clamp(3rem,10vw,7.5rem)]">
          {COPY.titulo1}
          <br />
          <span className="text-graphite-faint">{COPY.titulo2}</span>
        </h1>

        <div className="mt-12 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <p className="max-w-md text-graphite-soft text-lg leading-relaxed">{COPY.descricao}</p>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              to="/signin"
              className="inline-flex items-center gap-2 rounded-full bg-graphite px-7 py-3.5 font-medium text-paper transition-opacity hover:opacity-85"
            >
              {COPY.entrar}
              <span aria-hidden="true">→</span>
            </Link>

            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-graphite/25 px-7 py-3.5 font-medium text-graphite transition-colors hover:border-graphite/60"
            >
              {COPY.codigo}
            </a>
          </div>
        </div>

        <dl className="mt-24 grid grid-cols-1 gap-x-8 gap-y-8 border-rule border-t pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {PILARES.map((pilar) => (
            <div key={pilar.nome} className="flex flex-col gap-2">
              <dt className="landing-display text-[clamp(1.25rem,2.5vw,1.6rem)] tracking-tight">
                {pilar.nome}
              </dt>
              <dd className="max-w-52 text-graphite-soft text-sm leading-relaxed">{pilar.texto}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
