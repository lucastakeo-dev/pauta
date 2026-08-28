const COPY = {
  eyebrow: 'Parser de datas',
  titulo1: 'A biblioteca errava',
  titulo2: 'em silêncio.',
  texto:
    'O chrono-node declara suporte parcial a português. Medindo com 20 frases reais, ' +
    'acertou 13 — mas o problema não foi acertar pouco: nas que "acertava", devolvia a hora ' +
    'errada sem avisar. Uma data errada com cara de certa é pior que um "não entendi", porque ' +
    'ninguém confere o que parece pronto.',
  fecho:
    'Daí o parser próprio: um conjunto explícito de padrões, com 86 testes. O que não casa fica ' +
    'sem data, e a tela mostra o que foi entendido antes de confirmar.',
  colFrase: 'frase',
  colAntes: 'chrono',
  colDepois: 'Pauta',
}

/** Casos reais da medição que motivou escrever o parser. */
const CASOS = [
  { frase: 'almoço amanhã 13h', antes: '14:00', depois: '13:00' },
  { frase: 'reunião hoje às 16h', antes: '14:00', depois: '16:00' },
  { frase: 'jantar sábado 20h30', antes: '12:00', depois: '20:30' },
  { frase: 'jantar às 8 da noite', antes: '08:00', depois: '20:00' },
  { frase: 'comprar pão depois de amanhã', antes: 'amanhã', depois: '+2 dias' },
  { frase: 'call daqui 2 semanas', antes: '—', depois: '+14 dias' },
] as const

export function ParserSection() {
  return (
    <section id="parser" className="px-6 py-32">
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="landing-eyebrow">{COPY.eyebrow}</p>

          <h2 className="landing-display mt-8 text-[clamp(2.5rem,6vw,4.5rem)]">
            {COPY.titulo1}
            <br />
            <span className="text-graphite-faint">{COPY.titulo2}</span>
          </h2>

          <p className="mt-10 max-w-lg text-graphite-soft text-lg leading-relaxed">{COPY.texto}</p>
          <p className="mt-6 max-w-lg text-graphite-soft leading-relaxed">{COPY.fecho}</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-rule bg-paper-sunk">
          <div className="grid grid-cols-[1fr_5.5rem_5.5rem] gap-4 border-rule border-b px-5 py-3 font-mono text-[11px] text-graphite-faint uppercase tracking-wide">
            <span>{COPY.colFrase}</span>
            <span className="text-right">{COPY.colAntes}</span>
            <span className="text-right">{COPY.colDepois}</span>
          </div>

          <div className="flex flex-col divide-y divide-rule">
            {CASOS.map((caso) => (
              <div
                key={caso.frase}
                className="grid grid-cols-[1fr_5.5rem_5.5rem] items-center gap-4 px-5 py-3.5"
              >
                <span className="truncate text-graphite text-sm">{caso.frase}</span>
                <span className="text-right font-mono text-danger/80 text-sm line-through">
                  {caso.antes}
                </span>
                <span className="text-right font-mono text-graphite text-sm">{caso.depois}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
