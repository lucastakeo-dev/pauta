import type { ListTasksQuery } from '@pauta/contracts'
import { useMemo, useState } from 'react'
import { DayGrid } from '../features/planner/day-grid.js'
import { DayNav } from '../features/planner/day-nav.js'
import { PlannerDndProvider } from '../features/planner/planner-dnd.js'
import {
  PLANNER_VIEWS,
  type PlannerView,
  PlannerViewSwitcher,
} from '../features/planner/view-switcher.js'
import { WeekGrid } from '../features/planner/week-grid.js'
import { NewProjectDialog } from '../features/projects/project-dialog.js'
import { ProjectTree } from '../features/projects/project-tree.js'
import { useProjects } from '../features/projects/queries.js'
import { TaskComposer } from '../features/tasks/task-composer.js'
import { type TaskFilterState, TaskFilters } from '../features/tasks/task-filters.js'
import { TaskList } from '../features/tasks/task-list.js'
import { cn } from '../shared/lib/cn.js'
import { usePersistentChoice } from '../shared/lib/persistent.js'
import { SidebarGroup } from '../shared/ui/sidebar-group.js'
import { SidebarSlot } from '../shared/ui/sidebar-slot.js'

const COPY = {
  tarefas: 'Tarefas',
  projetos: 'Projetos',
  filtros: 'Filtros',
  planoDia: 'Planner do dia',
  planoSemana: 'Planner da semana',
}

/** Espelha `--spacing-hour` e o valor usado pela grade. */
const HOUR_HEIGHT = 56

/** A tela escolhida é preferência de quem olha, e sobrevive ao recarregar. */
const CHAVE_TELA = 'pauta.planner.view'

/**
 * Tarefas à esquerda, o tempo à direita — em três telas.
 *
 * As duas features não se conhecem: quem as põe lado a lado é esta página, e quem faz a
 * ponte do arrastar é o `PlannerDndProvider`, que envolve as duas. A lista publica um
 * `DragPayload`; a grade o consome.
 *
 * A moldura (marca, trilho, conta) mora no `AppShell`. O que entra no painel é desta
 * tela, e por isso nasce aqui, junto do estado que o alimenta: o `SidebarSlot` só o
 * entrega dentro daquele painel.
 */
export function PlannerPage() {
  const { data: projects } = useProjects()
  const [filters, setFilters] = useState<TaskFilterState>({ includeDone: false })
  const [day, setDay] = useState(() => new Date())
  const [view, setView] = usePersistentChoice<PlannerView>(CHAVE_TELA, PLANNER_VIEWS, 'dia')

  const query = useMemo<Partial<ListTasksQuery>>(
    () => ({
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.labelId ? { labelId: filters.labelId } : {}),
      includeDone: filters.includeDone,
      rootOnly: true,
    }),
    [filters],
  )

  // A lista some nas telas em que a grade é o conteúdo, não um painel ao lado.
  const mostraLista = view === 'dia'
  const semana = view === 'semana'

  return (
    <PlannerDndProvider hourHeight={HOUR_HEIGHT}>
      <SidebarSlot>
        <PlannerViewSwitcher value={view} onChange={setView} />

        {/*
          Aqui a árvore filtra em vez de navegar: quem está no planner quer estreitar a
          lista ao lado, não trocar de tela. Clicar de novo no mesmo projeto solta o filtro.
        */}
        <SidebarGroup title={COPY.projetos} count={projects?.length} action={<NewProjectDialog />}>
          <ProjectTree
            selectedId={filters.projectId}
            onSelect={(id) =>
              setFilters((atual) => ({
                ...atual,
                // `null` vem de "Todas"; clicar no projeto já ativo também solta o filtro.
                projectId: id === null || atual.projectId === id ? undefined : id,
              }))
            }
          />
        </SidebarGroup>

        <TaskFilters value={filters} onChange={setFilters} />
      </SidebarSlot>

      <div className="flex min-h-0 min-w-0 flex-1">
        {mostraLista ? (
          // A lista tem largura máxima e fica centralizada: linha de texto muito larga
          // cansa de ler, e numa tela grande a coluna ficava quase toda vazia.
          <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 pt-8 pb-6">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
              <h1 className="font-semibold text-ink text-lg">{COPY.tarefas}</h1>

              <TaskComposer projectId={filters.projectId} />
              <TaskList query={query} />
            </div>
          </main>
        ) : null}

        {/* A grade não rola com a página: ela tem a própria rolagem, ancorada no dia útil. */}
        <section
          aria-label={semana ? COPY.planoSemana : COPY.planoDia}
          className={cn(
            'flex min-w-0 flex-col px-4 pt-6 pb-6',
            mostraLista
              ? 'hidden w-[22rem] shrink-0 border-line border-l md:flex xl:w-[28rem] 2xl:w-[32rem]'
              : 'flex-1',
          )}
        >
          <DayNav day={day} onChange={setDay} unit={semana ? 'semana' : 'dia'} />
          {semana ? <WeekGrid reference={day} /> : <DayGrid day={day} />}
        </section>
      </div>
    </PlannerDndProvider>
  )
}
