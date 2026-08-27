import { type FormEvent, useState } from 'react'
import { cn } from '../../shared/lib/cn.js'
import { useCreateProject, useLabels, useProjects } from './queries.js'

const COPY = {
  todas: 'Todas',
  projetos: 'Projetos',
  etiquetas: 'Etiquetas',
  novoProjeto: 'Novo projeto',
  semProjetos: 'Nenhum projeto ainda.',
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
  const { data: projects } = useProjects()
  const { data: labels } = useLabels()

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-6" aria-label="Filtros">
      <FilterGroup title={COPY.projetos} action={<NewProjectButton />}>
        <FilterButton
          active={value.projectId === undefined}
          onClick={() => onChange({ ...value, projectId: undefined })}
          label={COPY.todas}
        />

        {projects?.length === 0 ? <Empty>{COPY.semProjetos}</Empty> : null}

        {projects?.map((project) => (
          <FilterButton
            key={project.id}
            active={value.projectId === project.id}
            onClick={() =>
              onChange({
                ...value,
                projectId: value.projectId === project.id ? undefined : project.id,
              })
            }
            label={project.name}
            color={project.color}
            count={project.openTaskCount}
          />
        ))}
      </FilterGroup>

      <FilterGroup title={COPY.etiquetas}>
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
      </FilterGroup>

      <label className="flex cursor-pointer items-center gap-2 px-3 text-ink-subtle text-xs">
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

function FilterGroup({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between px-3 pb-1">
        <h2 className="font-medium text-ink-subtle text-xs uppercase tracking-wider">{title}</h2>
        {action}
      </div>
      {children}
    </section>
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
        'flex items-center gap-2 rounded-control px-3 py-1.5 text-left text-sm transition-colors',
        active ? 'bg-surface-raised text-ink' : 'text-ink-muted hover:bg-surface',
      )}
    >
      {color ? (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-[3px]"
          style={{ backgroundColor: color }}
        />
      ) : null}

      <span className="min-w-0 flex-1 truncate">{label}</span>

      {count !== undefined && count > 0 ? (
        <span className="tabular text-ink-subtle text-xs">{count}</span>
      ) : null}
    </button>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-1 text-ink-subtle text-xs">{children}</p>
}

/** Criação inline: abre um campo no lugar do botão, sem tirar a pessoa da tela. */
function NewProjectButton() {
  const create = useCreateProject()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = name.trim()
    setName('')
    setOpen(false)

    if (!trimmed) return

    // O hook invalida a lista de projetos no sucesso; nome repetido volta 409 e o
    // campo simplesmente fecha sem criar nada.
    await create.mutateAsync({ name: trimmed, color: '#6E7BF2' }).catch(() => null)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={COPY.novoProjeto}
        className="rounded-control px-1 text-ink-subtle text-sm hover:text-ink"
      >
        +
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        // biome-ignore lint/a11y/noAutofocus: o campo só aparece após o clique, então o foco é a intenção
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => setOpen(false)}
        aria-label={COPY.novoProjeto}
        placeholder="Nome"
        className="h-6 w-24 rounded-[4px] border border-line bg-surface px-1.5 text-ink text-xs outline-none focus:border-iris"
      />
    </form>
  )
}
