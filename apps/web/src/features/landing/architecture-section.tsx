const COPY = {
  eyebrow: 'Arquitetura',
  titulo1: 'Fronteiras que',
  titulo2: 'o build cobra.',
  texto:
    'A API é MVC — só o model conhece o Prisma, o controller traduz HTTP, a view monta o JSON ' +
    'campo a campo. O front é em camadas, e a dependência só desce. Nada disso depende de ' +
    'disciplina: as duas regras são lint, e quebrá-las quebra o build.',
  legenda: 'pnpm lint',
}

/** Mensagens reais do `noRestrictedImports`, copiadas da saída do Biome. */
const ERROS = [
  {
    arquivo: 'apps/api/src/controllers/task.controller.ts',
    regra: 'lint/style/noRestrictedImports',
    mensagem: 'MVC: só models/ acessa o Prisma. Controller e view falam com o model.',
  },
  {
    arquivo: 'apps/web/src/features/tasks/task-item.tsx',
    regra: 'lint/style/noRestrictedImports',
    mensagem: 'Camadas: features não conversam entre si.',
  },
  {
    arquivo: 'apps/web/src/shared/ui/button.tsx',
    regra: 'lint/style/noRestrictedImports',
    mensagem: 'Camadas: shared é a base, não importa de cima. Só desce, nunca sobe.',
  },
] as const

const FLUXO = ['app', 'pages', 'features', 'entities', 'shared'] as const

export function ArchitectureSection() {
  return (
    <section id="arquitetura" className="landing-inverted px-6 py-32">
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="landing-eyebrow">{COPY.eyebrow}</p>

          <h2 className="landing-display mt-8 text-[clamp(2.5rem,6vw,4.5rem)]">
            {COPY.titulo1}
            <br />
            <span className="text-graphite-faint">{COPY.titulo2}</span>
          </h2>

          <p className="mt-10 max-w-lg text-lg text-paper/70 leading-relaxed">{COPY.texto}</p>

          <div className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-3 font-mono text-sm">
            {FLUXO.map((camada, indice) => (
              <span key={camada} className="flex items-center gap-2">
                <span className="rounded border border-paper/20 px-2.5 py-1 text-paper/85">
                  {camada}
                </span>
                {indice < FLUXO.length - 1 ? (
                  <span aria-hidden="true" className="text-paper/35">
                    →
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>

        {/* Saída real do lint: é a prova da afirmação ao lado, não ilustração. */}
        <div className="overflow-hidden rounded-xl border border-paper/15">
          <div className="flex items-center gap-2 border-paper/15 border-b px-4 py-3">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-paper/25" />
            <span aria-hidden="true" className="size-2.5 rounded-full bg-paper/25" />
            <span aria-hidden="true" className="size-2.5 rounded-full bg-paper/25" />
            <span className="ml-auto font-mono text-paper/50 text-xs">{COPY.legenda}</span>
          </div>

          <div className="flex flex-col divide-y divide-paper/10 font-mono text-xs">
            {ERROS.map((erro) => (
              <div key={erro.arquivo} className="flex flex-col gap-1.5 px-4 py-4">
                <span className="break-all text-paper/45">{erro.arquivo}</span>
                <span className="text-paper/35">{erro.regra}</span>
                <span className="text-[#F0857D] leading-relaxed">× {erro.mensagem}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
