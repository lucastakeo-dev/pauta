import type { CreateTaskInput, ListTasksQuery } from '@pauta/contracts'
import { groupByDue, priorityColorClass } from '../../entities/task/index.js'
import { usePendingTasks, useTasks } from './queries.js'
import { TaskItem } from './task-item.js'

const COPY = {
  carregando: 'Carregando tarefas…',
  erro: 'Não consegui carregar suas tarefas.',
  vaziaTitulo: 'Nada por aqui.',
  vaziaAjuda: 'Escreva acima e aperte Enter para registrar a primeira.',
  salvando: 'Salvando',
}

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

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-0.5">
          <h2 className="px-3 pb-1 font-medium text-ink-subtle text-xs uppercase tracking-wider">
            {group.title}
            <span className="tabular ml-2 text-ink-subtle/60">{group.tasks.length}</span>
          </h2>

          <ul className="flex flex-col">
            {group.tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </ul>
        </section>
      ))}

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
 * Repete a geometria da linha real — mesma altura, mesmo recuo, mesmo ponto de
 * prioridade — para que confirmar não empurre a lista. O que muda é a opacidade e a
 * caixa de marcar, que aqui é um contorno inerte: clicar nela ainda não faria nada.
 */
function PendingTaskItem({ input }: { input: CreateTaskInput }) {
  return (
    <li
      className="flex animate-pulse items-start gap-3 px-3 py-2.5 opacity-60"
      aria-label={`${COPY.salvando}: ${input.title}`}
    >
      <span aria-hidden="true" className="mt-0.5 w-3 shrink-0" />

      <span
        aria-hidden="true"
        className={`mt-[7px] size-1.5 shrink-0 rounded-full ${priorityColorClass(input.priority ?? 4)}`}
      />

      <span
        aria-hidden="true"
        className="mt-px size-[18px] shrink-0 rounded-[6px] border border-line-strong border-dashed"
      />

      <span className="min-w-0 flex-1 text-ink-muted text-sm">{input.title}</span>
    </li>
  )
}
