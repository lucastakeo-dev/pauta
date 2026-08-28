import { Link } from '@tanstack/react-router'
import { REPO_URL } from './landing-nav.js'

const COPY = {
  eyebrow: 'Stack',
  titulo1: 'Escolhas',
  titulo2: 'com motivo.',
  ctaTitulo: 'Feito para uso próprio.',
  ctaTexto: 'O código está aberto, e a conta leva um minuto.',
  entrar: 'Entrar',
  codigo: 'Ver o código',
  rodape: 'Pauta — ferramenta pessoal de planejamento',
}

const STACK = [
  { area: 'Front', valor: 'Vite · React 19 · TanStack Router · Tailwind v4' },
  { area: 'API', valor: 'Fastify 5 · Zod 4 · Prisma 7' },
  { area: 'Banco', valor: 'PostgreSQL 17 · Supabase em produção' },
  { area: 'Auth', valor: 'JWT próprio · argon2id' },
  { area: 'Editor', valor: 'Tiptap 3' },
  { area: 'Qualidade', valor: 'Biome 2 · Vitest · Playwright' },
] as const

export function StackSection() {
  return (
    <>
      <section id="stack" className="px-6 py-32">
        <div className="mx-auto max-w-6xl">
          <p className="landing-eyebrow">{COPY.eyebrow}</p>

          <h2 className="landing-display mt-8 text-[clamp(2.5rem,6vw,4.5rem)]">
            {COPY.titulo1}
            <br />
            <span className="text-graphite-faint">{COPY.titulo2}</span>
          </h2>

          <dl className="mt-20 flex flex-col">
            {STACK.map((item) => (
              <div
                key={item.area}
                className="grid gap-2 border-rule border-t py-5 sm:grid-cols-[10rem_1fr]"
              >
                <dt className="font-mono text-graphite-faint text-xs uppercase tracking-wide">
                  {item.area}
                </dt>
                <dd className="text-graphite">{item.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

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

          <p className="mt-16 border-paper/15 border-t pt-8 font-mono text-paper/40 text-xs">
            {COPY.rodape}
          </p>
        </div>
      </section>
    </>
  )
}
