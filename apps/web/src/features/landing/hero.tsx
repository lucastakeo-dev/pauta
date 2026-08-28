import { Link } from '@tanstack/react-router'
import { REPO_URL } from './landing-nav.js'

const COPY = {
  eyebrow: 'Ferramenta pessoal, código aberto',
  titulo1: 'Planejar o dia',
  titulo2: 'num app só.',
  descricao:
    'Tarefas, agenda e notas no mesmo lugar, feitos para o teclado. ' +
    'Construído do zero para uso próprio — e aberto para quem quiser ler o código.',
  entrar: 'Entrar',
  codigo: 'Ver o código',
}

/** Números reais do projeto. Vitrine técnica não inventa métrica. */
const NUMEROS = [
  { valor: '293', rotulo: 'testes automatizados' },
  { valor: '7', rotulo: 'suítes no navegador' },
  { valor: '4', rotulo: 'módulos no v1' },
  { valor: '0', rotulo: 'dependência de parser de data' },
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
              to="/login"
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

        <dl className="mt-24 grid grid-cols-2 gap-x-8 gap-y-10 border-rule border-t pt-10 lg:grid-cols-4">
          {NUMEROS.map((numero) => (
            <div key={numero.rotulo} className="flex flex-col gap-1">
              <dt className="landing-display text-[clamp(2.25rem,5vw,3.5rem)]">{numero.valor}</dt>
              <dd className="font-mono text-[11px] text-graphite-soft uppercase tracking-wide">
                {numero.rotulo}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
