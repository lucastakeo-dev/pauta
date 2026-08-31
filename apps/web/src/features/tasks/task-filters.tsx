import { cn } from '../../shared/lib/cn.js'
import { SidebarGroup } from '../../shared/ui/sidebar-group.js'
import { sidebarRow, sidebarRowActive, sidebarRowIdle } from '../../shared/ui/sidebar-row.js'
import { useLabels } from './queries.js'

const COPY = {
  etiquetas: 'Etiquetas',
  semEtiquetas: 'Nenhuma etiqueta ainda.',
  mostrarConcluidas: 'Mostrar concluídas',
}

export type TaskFilterState = {
  projectId?: string | undefined
  labelId?: string | undefined
  includeDone: boolean
}

type TaskFiltersProps = {
  value: TaskFilterState
  onChange: (next: TaskFilterState) => void
}

export function TaskFilters({ value, onChange }: TaskFiltersProps) {
  const { data: labels } = useLabels()

  return (
    <nav className="flex flex-col" aria-label="Filtros">
      <SidebarGroup title={COPY.etiquetas} count={labels?.length}>
        {labels?.length === 0 ? <Empty>{COPY.semEtiquetas}</Empty> : null}

        {labels?.map((label) => (
          <FilterButton
            key={label.id}
            active={value.labelId === label.id}
            onClick={() =>
              onChange({ ...value, labelId: value.labelId === label.id ? undefined : label.id })
            }
            label={`#${label.name}`}
            color={label.color}
          />
        ))}
      </SidebarGroup>

      <label className="flex h-8 cursor-pointer items-center gap-2 px-2 text-ink-subtle text-xs">
        <input
          type="checkbox"
          checked={value.includeDone}
          onChange={(event) => onChange({ ...value, includeDone: event.target.checked })}
          className="accent-iris"
        />
        {COPY.mostrarConcluidas}
      </label>
    </nav>
  )
}

function FilterButton({
  active,
  onClick,
  label,
  color,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  color?: string
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        sidebarRow,
        'transition-[colors,transform] duration-150 ease-press active:scale-[0.98]',
        active ? sidebarRowActive : sidebarRowIdle,
      )}
    >
      {/* A cor da etiqueta ocupa a mesma caixa de 16px do ícone dos projetos: sem
          isso, os nomes das etiquetas começariam quatro pixels à esquerda dos deles. */}
      {color ? (
        <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">
          <span className="size-2 rounded-[3px]" style={{ backgroundColor: color }} />
        </span>
      ) : null}

      <span className="min-w-0 flex-1 truncate">{label}</span>

      {count !== undefined && count > 0 ? (
        <span className="tabular text-ink-subtle text-xs">{count}</span>
      ) : null}
    </button>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-2 py-1.5 text-ink-subtle text-xs">{children}</p>
}
