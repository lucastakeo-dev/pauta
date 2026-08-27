import type { ListTasksQuery } from '@pauta/contracts'
import { groupByDue } from '../../entities/task/index.js'
import { useTasks } from './queries.js'
import { TaskItem } from './task-item.js'

const COPY = {
  carregando: 'Carregando tarefas…',
  erro: 'Não consegui carregar suas tarefas.',
  vaziaTitulo: 'Nada por aqui.',
  vaziaAjuda: 'Escreva acima e aperte Enter para registrar a primeira.',
}

type TaskListProps = {
  query: Partial<ListTasksQuery>
}

export function TaskList({ query }: TaskListProps) {
  const { data: tasks, isPending, isError } = useTasks(query)

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

  if (tasks.length === 0) {
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
    </div>
  )
}
