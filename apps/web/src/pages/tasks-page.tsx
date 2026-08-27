import type { ListTasksQuery } from '@pauta/contracts'
import { useMemo, useState } from 'react'
import { useSession } from '../features/auth/session-context.js'
import { TaskComposer } from '../features/tasks/task-composer.js'
import { type TaskFilterState, TaskFilters } from '../features/tasks/task-filters.js'
import { TaskList } from '../features/tasks/task-list.js'
import { Button } from '../shared/ui/button.js'

const COPY = {
  titulo: 'Tarefas',
  sair: 'Sair',
  marca: 'Pauta',
}

/**
 * Camada de apresentação: compõe a tela e guarda só o estado que é dela — os filtros.
 * Buscar, criar e concluir são responsabilidade da feature.
 */
export function TasksPage() {
  const { signOut } = useSession()
  const [filters, setFilters] = useState<TaskFilterState>({ includeDone: false })

  const query = useMemo<Partial<ListTasksQuery>>(
    () => ({
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.labelId ? { labelId: filters.labelId } : {}),
      includeDone: filters.includeDone,
      rootOnly: true,
    }),
    [filters],
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-line border-b px-6 py-3">
        <span className="font-mono text-iris text-xs uppercase tracking-widest">{COPY.marca}</span>
        <Button variant="ghost" onClick={signOut}>
          {COPY.sair}
        </Button>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-10 px-6 py-8">
        <TaskFilters value={filters} onChange={setFilters} />

        <main className="flex min-w-0 flex-1 flex-col gap-6">
          <h1 className="font-semibold text-ink text-xl">{COPY.titulo}</h1>

          <TaskComposer projectId={filters.projectId} />

          <TaskList query={query} />
        </main>
      </div>
    </div>
  )
}
