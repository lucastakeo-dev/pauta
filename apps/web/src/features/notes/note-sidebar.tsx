import { Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNotes } from '../../entities/note/index.js'
import { cn } from '../../shared/lib/cn.js'
import { SidebarGroup } from '../../shared/ui/sidebar-group.js'
import { sidebarRow, sidebarRowActive, sidebarRowIdle } from '../../shared/ui/sidebar-row.js'
import { useCreateNote } from './queries.js'

const COPY = {
  hoje: 'Nota de hoje',
  paginas: 'Páginas',
  nova: 'Nova página',
  buscar: 'Buscar nota',
  vazio: 'Nenhuma página ainda.',
  semResultado: 'Nada encontrado.',
}

type NoteSidebarProps = {
  selectedId: string | null
  dailyId: string | null
  onSelect: (id: string) => void
}

export function NoteSidebar({ selectedId, dailyId, onSelect }: NoteSidebarProps) {
  const [search, setSearch] = useState('')
  const { data: notes } = useNotes(search.trim() || undefined)
  const create = useCreateNote()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = title.trim()
    setTitle('')
    setCreating(false)

    if (!trimmed) return

    // Título repetido volta 409 e o campo simplesmente fecha, como na barra lateral
    // de projetos.
    const nota = await create.mutateAsync({ title: trimmed }).catch(() => null)
    if (nota) onSelect(nota.id)
  }

  const paginas = notes?.filter((note) => note.id !== dailyId) ?? []

  return (
    <nav aria-label="Notas" className="flex min-h-0 flex-col gap-2">
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={COPY.buscar}
        aria-label={COPY.buscar}
        className="h-8 rounded-[10px] border border-line bg-surface px-2.5 text-[13px] text-ink outline-none placeholder:text-ink-subtle focus:border-iris"
      />

      {dailyId ? (
        <button
          type="button"
          onClick={() => onSelect(dailyId)}
          aria-pressed={selectedId === dailyId}
          className={cn(sidebarRow, selectedId === dailyId ? sidebarRowActive : sidebarRowIdle)}
        >
          {COPY.hoje}
        </button>
      ) : null}

      <SidebarGroup
        title={COPY.paginas}
        count={paginas.length}
        action={
          creating ? null : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              aria-label={COPY.nova}
              title={COPY.nova}
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-[4px] text-ink-subtle',
                'transition-[colors,transform] duration-150 ease-press',
                'hover:bg-surface-raised hover:text-ink active:scale-90',
              )}
            >
              <Plus aria-hidden="true" className="size-3.5" />
            </button>
          )
        }
      >
        {creating ? (
          <form onSubmit={handleCreate} className="px-2 pb-1">
            <input
              // biome-ignore lint/a11y/noAutofocus: o campo só aparece após o clique, então o foco é a intenção
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => setCreating(false)}
              aria-label={COPY.nova}
              placeholder="Título"
              className="h-8 w-full rounded-[4px] border border-line bg-surface px-2 text-ink text-xs outline-none focus:border-iris"
            />
          </form>
        ) : null}

        <div className="flex min-h-0 flex-col overflow-y-auto">
          {paginas.length === 0 ? (
            <p className="px-2 py-1.5 text-ink-subtle text-xs">
              {search.trim() ? COPY.semResultado : COPY.vazio}
            </p>
          ) : null}

          {paginas.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => onSelect(note.id)}
              aria-pressed={selectedId === note.id}
              className={cn(sidebarRow, selectedId === note.id ? sidebarRowActive : sidebarRowIdle)}
            >
              <span className="truncate">{note.title}</span>
            </button>
          ))}
        </div>
      </SidebarGroup>
    </nav>
  )
}
