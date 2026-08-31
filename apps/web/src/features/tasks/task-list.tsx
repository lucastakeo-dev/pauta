import type { CreateTaskInput, ListTasksQuery } from '@pauta/contracts'
import { Circle, CircleAlert, CircleDashed, CircleDot } from 'lucide-react'
import { groupByDue } from '../../entities/task/index.js'
import { cn } from '../../shared/lib/cn.js'
import { usePendingTasks, useTasks } from './queries.js'
import { PriorityBars, TASK_ROW, TaskItem } from './task-item.js'

const COPY = {
  carregando: 'Carregando tarefas…',
  erro: 'Não consegui carregar suas tarefas.',
  vaziaTitulo: 'Nada por aqui.',
  vaziaAjuda: 'Escreva acima e aperte Enter para registrar a primeira.',
  salvando: 'Salvando',
}

/**
 * O ícone de cada grupo, na ordem de urgência que o agrupamento já impõe.
 *
 * O círculo muda de forma, e não só de cor: cheio para o que venceu, vazado para o que
 * ainda não tem data. Cor sozinha não é sinal para quem não a distingue.
 */
const GRUPOS = {
  overdue: { Icon: CircleAlert, tom: 'text-danger' },
  today: { Icon: CircleDot, tom: 'text-iris' },
  upcoming: { Icon: Circle, tom: 'text-ink-muted' },
  someday: { Icon: CircleDashed, tom: 'text-ink-subtle' },
} satisfies Record<string, { Icon: typeof Circle; tom: string }>

type TaskListProps = {
  query: Partial<ListTasksQuery>
}

export function TaskList({ query }: TaskListProps) {
  const { data: tasks, isPending, isError } = useTasks(query)

  // O campo de entrada limpa assim que a pessoa aperta Enter, para ela já digitar a
  // próxima. Sem estas linhas, o que ela escreveu sumiria da tela até a resposta voltar.
  const aCaminho = usePendingTasks()

  if (isPending) {
    return (
      <p role="status" aria-live="polite" className="px-3 py-8 text-ink-subtle text-sm">
        {COPY.carregando}
      </p>
    )
  }

  if (isError) {
    return (
      <p role="alert" className="px-3 py-8 text-danger text-sm">
        {COPY.erro}
      </p>
    )
  }

  if (tasks.length === 0 && aCaminho.length === 0) {
    // Estado vazio é conteúdo, não sobra: diz o que fazer em seguida.
    return (
      <div className="flex flex-col items-center gap-1.5 px-3 py-16 text-center">
        <p className="font-medium text-ink text-sm">{COPY.vaziaTitulo}</p>
        <p className="text-ink-subtle text-sm">{COPY.vaziaAjuda}</p>
      </div>
    )
  }

  const groups = groupByDue(tasks)

  // Dentro de um projeto, repetir o nome dele em toda linha não informa nada: a lista
  // inteira é dele. Vale igual para o planner com um projeto filtrado.
  const mostraProjeto = !query.projectId

  return (
    // Sem respiro entre os grupos: o cabeçalho já os separa, e o traço contínuo é o que
    // faz as colunas da direita se lerem como colunas de uma tabela só.
    <div className="flex flex-col border-line/60 border-t">
      {groups.map((group) => {
        const { Icon, tom } = GRUPOS[group.key as keyof typeof GRUPOS] ?? GRUPOS.upcoming
        return (
          <section key={group.key} className="flex flex-col">
            {/* O ícone ocupa a caixa da caixa de marcar e o vão da alça vem antes:
                é o que põe o nome do grupo na mesma abscissa dos títulos abaixo. */}
            <h2 className={cn(TASK_ROW, 'gap-2 border-line/60 border-b bg-surface-raised/35')}>
              <span aria-hidden="true" className="size-4 shrink-0" />
              <span className="flex size-[18px] shrink-0 items-center justify-center">
                <Icon aria-hidden="true" className={cn('size-3.5', tom)} />
              </span>
              <span className="font-medium text-[13px] text-ink">{group.title}</span>
              <span className="tabular text-ink-subtle text-xs">{group.tasks.length}</span>
            </h2>

            <ul className="flex flex-col">
              {group.tasks.map((task) => (
                <TaskItem key={task.id} task={task} showProject={mostraProjeto} />
              ))}
            </ul>
          </section>
        )
      })}

      {aCaminho.length > 0 ? (
        <ul className="flex flex-col">
          {aCaminho.map((pendente) => (
            <PendingTaskItem key={pendente.id} input={pendente.input} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * Tarefa enviada e ainda sem resposta.
 *
 * Repete a geometria da linha real — mesma altura, mesmas colunas, mesma prioridade na
 * ponta — para que confirmar não empurre a lista. O que muda é a opacidade e a caixa de
 * marcar, que aqui é um contorno inerte: clicar nela ainda não faria nada.
 */
function PendingTaskItem({ input }: { input: CreateTaskInput }) {
  return (
    <li
      className={cn(TASK_ROW, 'animate-pulse border-line/60 border-b opacity-60')}
      aria-label={`${COPY.salvando}: ${input.title}`}
    >
      <span aria-hidden="true" className="size-4 shrink-0" />

      <span
        aria-hidden="true"
        className="size-[18px] shrink-0 rounded-[6px] border border-line-strong border-dashed"
      />

      <span className="min-w-0 flex-1 truncate text-ink-muted text-sm">{input.title}</span>

      <span className="flex shrink-0 items-center pl-3">
        <PriorityBars priority={input.priority ?? 4} />
      </span>
    </li>
  )
}
