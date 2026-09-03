const COPY = {
  eyebrow: 'A rotina',
  titulo1: 'Anotar é fácil.',
  titulo2: 'Decidir é o trabalho.',
  texto:
    'A maioria dos apps trata as duas coisas como uma só, e a lista vira um depósito. ' +
    'Aqui elas são separadas: tudo que você captura cai numa fila, e é lá que vira decisão — ' +
    'projeto, prazo, hora no dia. A lista de hoje só mostra o que já foi decidido.',
  legenda: '⌘K',
  frase: 'almoço com a Ana amanhã 13h #pessoal @Casa p2',
  entendi: 'O que o Pauta entendeu',
}

/** Os quatro passos, na ordem em que acontecem. */
const FLUXO = ['capturar', 'decidir', 'planejar', 'concluir'] as const

/** A leitura real da frase acima — é o que a prévia da captura mostra na tela. */
const CAMPOS = [
  { campo: 'tarefa', valor: 'almoço com a Ana' },
  { campo: 'quando', valor: 'amanhã às 13:00' },
  { campo: 'projeto', valor: 'Casa' },
  { campo: 'etiqueta', valor: '#pessoal' },
  { campo: 'prioridade', valor: 'P2' },
] as const

/**
 * O ciclo do produto, com a captura como prova.
 *
 * Esta seção substituiu a de arquitetura. O painel escuro continua sendo o momento de
 * contraste da página; o que mudou é o que ele demonstra — antes, mensagens de lint;
 * agora, a frase virando compromisso, que é a coisa mais difícil de explicar sem ver.
 */
export function RoutineSection() {
  return (
    <section id="rotina" className="landing-inverted px-6 py-32">
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
            {FLUXO.map((passo, indice) => (
              <span key={passo} className="flex items-center gap-2">
                <span className="rounded border border-paper/20 px-2.5 py-1 text-paper/85">
                  {passo}
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

        <div className="overflow-hidden rounded-xl border border-paper/15">
          <div className="flex items-center gap-2 border-paper/15 border-b px-4 py-3">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-paper/25" />
            <span aria-hidden="true" className="size-2.5 rounded-full bg-paper/25" />
            <span aria-hidden="true" className="size-2.5 rounded-full bg-paper/25" />
            <span className="ml-auto font-mono text-paper/50 text-xs">{COPY.legenda}</span>
          </div>

          <p className="px-5 py-5 text-lg text-paper/90">{COPY.frase}</p>

          <p className="border-paper/10 border-t px-5 pt-4 pb-2 font-mono text-[11px] text-paper/40 uppercase tracking-wide">
            {COPY.entendi}
          </p>

          <div className="flex flex-col divide-y divide-paper/10 pb-1">
            {CAMPOS.map((linha) => (
              <div
                key={linha.campo}
                className="grid grid-cols-[6.5rem_1fr] items-center gap-4 px-5 py-3"
              >
                <span className="font-mono text-paper/40 text-xs">{linha.campo}</span>
                <span className="text-paper/90 text-sm">{linha.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
