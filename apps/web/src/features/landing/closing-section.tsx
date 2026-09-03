import { Link } from '@tanstack/react-router'
import { REPO_URL } from './landing-nav.js'

const COPY = {
  ctaTitulo: 'Comece pelo dia de hoje.',
  ctaTexto: 'A conta leva um minuto.',
  entrar: 'Começar agora',
  codigo: 'Ver o código',
  aberto:
    'Pauta é software livre sob licença MIT: dá para usar, ler, mudar e rodar no seu próprio ' +
    'servidor. Seus dados ficam onde você os colocar.',
  rodape: 'Pauta — agenda, tarefas e notas num app só',
}

/**
 * O fecho.
 *
 * Antes esta seção listava a stack — Vite, Fastify, Prisma. Saiu por não responder a
 * pergunta de quem chegou até aqui, que a essa altura é "começo por onde?". O que
 * sobrou de técnico é a única parte que também é promessa ao usuário: o código é aberto
 * e os dados são dele.
 */
export function ClosingSection() {
  return (
    <section className="landing-inverted px-6 py-32">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-10">
        <h2 className="landing-display text-[clamp(2.5rem,7vw,5rem)]">
          {COPY.ctaTitulo}
          <br />
          <span className="text-graphite-faint">{COPY.ctaTexto}</span>
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/signin"
            className="inline-flex items-center gap-2 rounded-full bg-paper px-7 py-3.5 font-medium text-graphite transition-opacity hover:opacity-85"
          >
            {COPY.entrar}
            <span aria-hidden="true">→</span>
          </Link>

          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-paper/30 px-7 py-3.5 font-medium text-paper transition-colors hover:border-paper/70"
          >
            {COPY.codigo}
          </a>
        </div>

        <p className="mt-10 max-w-xl text-paper/60 leading-relaxed">{COPY.aberto}</p>

        <p className="mt-6 w-full border-paper/15 border-t pt-8 font-mono text-paper/40 text-xs">
          {COPY.rodape}
        </p>
      </div>
    </section>
  )
}
