const COPY = {
  eyebrow: 'Módulos',
  titulo1: 'O que existe.',
  titulo2: 'E só isso.',
}

const MODULOS = [
  {
    numero: '01',
    nome: 'Planner do dia',
    texto:
      'Grade de horas com os compromissos e as tarefas agendadas na mesma linha do tempo. ' +
      'Arraste da lista para reservar o horário, ou use o formulário, que também funciona só com o teclado.',
  },
  {
    numero: '02',
    nome: 'Tarefas',
    texto:
      'Prioridade, projetos, etiquetas e subtarefas. Recorrência guardada como RRULE: as ocorrências ' +
      'futuras são calculadas na leitura e só viram linha no banco quando você mexe nelas.',
  },
  {
    numero: '03',
    nome: 'Captura rápida',
    texto:
      'Ctrl+K de qualquer tela. Escreva "almoço com a Ana amanhã 13h #pessoal @Casa p2" e veja a ' +
      'interpretação antes de confirmar — o que não foi entendido aparece, em vez de virar palpite.',
  },
  {
    numero: '04',
    nome: 'Notas',
    texto:
      'Uma nota por dia, criada na primeira visita, mais páginas livres. Escreva [[assim]] para ligar ' +
      'duas notas: a página citada nasce se ainda não existir, e o backlink aparece do outro lado.',
  },
] as const

export function ModulesSection() {
  return (
    <section id="modulos" className="px-6 py-32">
      <div className="mx-auto max-w-6xl">
        <p className="landing-eyebrow">{COPY.eyebrow}</p>

        <h2 className="landing-display mt-8 text-[clamp(2.5rem,6vw,4.5rem)]">
          {COPY.titulo1}
          <br />
          <span className="text-graphite-faint">{COPY.titulo2}</span>
        </h2>

        <ol className="mt-24 flex flex-col">
          {MODULOS.map((modulo) => (
            <li
              key={modulo.numero}
              className="grid gap-x-12 gap-y-4 border-rule border-t py-12 md:grid-cols-[4rem_1fr_1.2fr]"
            >
              <span className="font-mono text-graphite-faint text-sm">{modulo.numero}</span>

              <h3 className="landing-display text-[clamp(1.5rem,3vw,2rem)] tracking-tight">
                {modulo.nome}
              </h3>

              <p className="max-w-xl text-graphite-soft leading-relaxed">{modulo.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
