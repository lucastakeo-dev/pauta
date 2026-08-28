import type { ListTasksQuery } from '@pauta/contracts'
import { useMemo, useState } from 'react'
import { DayGrid } from '../features/planner/day-grid.js'
import { DayNav } from '../features/planner/day-nav.js'
import { PlannerDndProvider } from '../features/planner/planner-dnd.js'
import { TaskComposer } from '../features/tasks/task-composer.js'
import { type TaskFilterState, TaskFilters } from '../features/tasks/task-filters.js'
import { TaskList } from '../features/tasks/task-list.js'
import { SidebarSlot } from '../shared/ui/sidebar-slot.js'

const COPY = {
  tarefas: 'Tarefas',
}

/** Espelha `--spacing-hour` e o valor usado pela grade. */
const HOUR_HEIGHT = 56

/**
 * Tarefas à esquerda, o dia à direita.
 *
 * As duas features não se conhecem — quem as põe lado a lado é esta página, e quem faz
 * a ponte do arrastar é o `PlannerDndProvider`, que envolve as duas. A lista publica um
 * `DragPayload`; a grade o consome. Nenhuma importa a outra.
 *
 * A moldura (identidade, navegação, captura rápida) mora no `AppShell`, em `app/` — ela
 * é a mesma nas telas logadas, e o console precisa valer em todas. Os filtros são desta
 * tela, e por isso nascem aqui, junto do estado que os alimenta: o `SidebarSlot` só os
 * entrega dentro daquela barra.
 */
export function PlannerPage() {
  const [filters, setFilters] = useState<TaskFilterState>({ includeDone: false })
  const [day, setDay] = useState(() => new Date())

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
      <SidebarSlot>
        <TaskFilters value={filters} onChange={setFilters} />
      </SidebarSlot>

      <div className="flex min-h-0 min-w-0 flex-1">
        {/*
          A lista tem largura máxima e fica centralizada: linha de texto muito larga
          cansa de ler, e numa tela grande a coluna ficava quase toda vazia.
        */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 pt-8 pb-6">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
            <h1 className="font-semibold text-ink text-lg">{COPY.tarefas}</h1>

            <TaskComposer projectId={filters.projectId} />
            <TaskList query={query} />
          </div>
        </main>

        {/* A grade não rola com a página: ela tem a própria rolagem, ancorada no dia útil. */}
        <section
          aria-label="Planner do dia"
          className="hidden w-[22rem] shrink-0 flex-col border-line border-l px-4 pt-8 pb-6 md:flex xl:w-[28rem] 2xl:w-[32rem]"
        >
          <DayNav day={day} onChange={setDay} />
          <DayGrid day={day} />
        </section>
      </div>
    </PlannerDndProvider>
  )
}
