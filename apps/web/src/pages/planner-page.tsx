import type { ListTasksQuery } from '@pauta/contracts'
import { useMemo, useState } from 'react'
import { useSession } from '../features/auth/session-context.js'
import { ConsoleOverlay } from '../features/console/console-overlay.js'
import { useConsoleShortcut } from '../features/console/use-console-shortcut.js'
import { DayGrid } from '../features/planner/day-grid.js'
import { DayNav } from '../features/planner/day-nav.js'
import { PlannerDndProvider } from '../features/planner/planner-dnd.js'
import { TaskComposer } from '../features/tasks/task-composer.js'
import { type TaskFilterState, TaskFilters } from '../features/tasks/task-filters.js'
import { TaskList } from '../features/tasks/task-list.js'
import { Button } from '../shared/ui/button.js'

const COPY = {
  marca: 'Pauta',
  sair: 'Sair',
  tarefas: 'Tarefas',
  console: 'Captura rápida (Ctrl+K)',
}

/** Espelha `--spacing-hour` e o valor usado pela grade. */
const HOUR_HEIGHT = 56

/**
 * A tela principal: tarefas à esquerda, o dia à direita.
 *
 * As duas features não se conhecem — quem as põe lado a lado é esta página, e quem faz
 * a ponte do arrastar é o `PlannerDndProvider`, que envolve as duas. A lista publica um
 * `DragPayload`; a grade o consome. Nenhuma importa a outra.
 *
 * A página guarda só o estado que é dela: os filtros e o dia mostrado.
 */
export function PlannerPage() {
  const { signOut } = useSession()
  const [filters, setFilters] = useState<TaskFilterState>({ includeDone: false })
  const [day, setDay] = useState(() => new Date())
  const quickCapture = useConsoleShortcut()

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
    <PlannerDndProvider day={day} hourHeight={HOUR_HEIGHT}>
      <div className="flex h-dvh flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-line border-b px-6 py-3">
          <span className="font-mono text-iris text-xs uppercase tracking-widest">
            {COPY.marca}
          </span>
          <Button variant="ghost" onClick={signOut}>
            {COPY.sair}
          </Button>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden shrink-0 overflow-y-auto border-line border-r px-4 py-6 lg:block">
            <TaskFilters value={filters} onChange={setFilters} />
          </aside>

          <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-6 py-6">
            <h1 className="pb-4 font-semibold text-ink text-lg">{COPY.tarefas}</h1>

            <div className="flex flex-col gap-6">
              <TaskComposer projectId={filters.projectId} />
              <TaskList query={query} />
            </div>
          </main>

          {/* A grade não rola com a página: ela tem a própria rolagem, ancorada no dia útil. */}
          <section
            aria-label="Planner do dia"
            className="hidden w-[22rem] shrink-0 flex-col border-line border-l px-4 py-6 md:flex xl:w-[28rem] 2xl:w-[32rem]"
          >
            <DayNav day={day} onChange={setDay} />
            <DayGrid day={day} />
          </section>
        </div>

        {quickCapture.open ? <ConsoleOverlay onClose={() => quickCapture.setOpen(false)} /> : null}
      </div>
    </PlannerDndProvider>
  )
}
