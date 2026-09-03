const COPY = {
  eyebrow: 'Feito para o teclado',
  titulo1: 'As mãos não saem',
  titulo2: 'do lugar.',
  texto:
    'Capturar, agendar, concluir e navegar têm caminho pelo teclado — não como atalho de ' +
    'especialista, mas como o jeito normal de usar. O mouse continua funcionando; ele só deixa ' +
    'de ser obrigatório.',
  fecho:
    'E a tela se adapta a você: tema claro ou escuro, oito cores de acento e uma versão de ' +
    'celular em que a barra vira gaveta — a mesma conta, os mesmos dados, do monitor ao bolso.',
  colAtalho: 'atalho',
  colFaz: 'o que faz',
}

/** Só o que existe hoje. Vitrine que promete atalho inexistente vira reclamação. */
const ATALHOS = [
  { atalho: '⌘K', faz: 'Captura rápida, de qualquer tela' },
  { atalho: '⌘J', faz: 'Abre o Agent' },
  { atalho: '↑ ↓', faz: 'Percorre a fila do inbox' },
  { atalho: 'Enter', faz: 'Cria e salva' },
  { atalho: 'Esc', faz: 'Fecha o que estiver aberto' },
] as const

/**
 * O teclado como recurso de produto.
 *
 * Substituiu a seção do parser de datas. Aquela contava uma boa história de engenharia —
 * a biblioteca que errava em silêncio — mas respondia a uma pergunta que ninguém faz
 * antes de criar a conta. A tabela ficou; o conteúdo dela agora é o que a pessoa ganha.
 */
export function KeyboardSection() {
  return (
    <section id="teclado" className="px-6 py-32">
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
          <div className="grid grid-cols-[5rem_1fr] gap-4 border-rule border-b px-5 py-3 font-mono text-[11px] text-graphite-faint uppercase tracking-wide">
            <span>{COPY.colAtalho}</span>
            <span>{COPY.colFaz}</span>
          </div>

          <div className="flex flex-col divide-y divide-rule">
            {ATALHOS.map((linha) => (
              <div
                key={linha.atalho}
                className="grid grid-cols-[5rem_1fr] items-center gap-4 px-5 py-3.5"
              >
                <span className="font-mono text-graphite text-sm">{linha.atalho}</span>
                <span className="text-graphite-soft text-sm">{linha.faz}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
