const COPY = {
  eyebrow: 'Recursos',
  titulo1: 'Quatro coisas.',
  titulo2: 'Um app.',
}

/**
 * O que dá para fazer, em ordem de uso.
 *
 * O texto fala do que a pessoa faz, não de como está construído: quem escolhe um app de
 * planejamento quer saber se ele resolve a terça-feira dela, e "RRULE" não responde
 * isso. O como está no repositório, a um clique daqui.
 */
const MODULOS = [
  {
    numero: '01',
    nome: 'Agenda e planner',
    texto:
      'Veja o dia em blocos de hora, com os compromissos e as tarefas agendadas na mesma linha do ' +
      'tempo. Arraste uma tarefa da lista para reservar o horário, estique o bloco para mudar a ' +
      'duração, ou clique num espaço vazio para marcar uma reunião ali mesmo. Tem a visão do dia, ' +
      'da semana inteira e do calendário sozinho, para quando o dia é só reunião.',
  },
  {
    numero: '02',
    nome: 'Tarefas do seu jeito',
    texto:
      'Projetos dentro de projetos, etiquetas coloridas, quatro níveis de prioridade e subtarefas ' +
      'com barra de progresso. O que se repete toda segunda você cadastra uma vez. E o que vence ' +
      'aparece no calendário junto do resto do dia, em vez de viver numa lista à parte.',
  },
  {
    numero: '03',
    nome: 'Captura em segundos',
    texto:
      'Aperte ⌘K em qualquer tela e escreva "almoço com a Ana amanhã 13h #pessoal @Casa p2". ' +
      'O Pauta separa data, hora, projeto, etiqueta e prioridade — e mostra o que entendeu antes ' +
      'de salvar. O que chega sem decisão espera na inbox, sem sujar a lista de hoje.',
  },
  {
    numero: '04',
    nome: 'Notas ligadas ao dia',
    texto:
      'Uma nota nova para cada dia, criada sozinha na primeira visita, mais páginas livres para o ' +
      'que não tem data. Escreva [[assim]] para ligar duas páginas: a citada nasce se ainda não ' +
      'existir, e o link de volta aparece do outro lado.',
  },
] as const

export function ModulesSection() {
  return (
    <section id="recursos" className="px-6 py-32">
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
