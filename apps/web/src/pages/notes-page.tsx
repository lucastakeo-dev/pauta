import { useState } from 'react'
import { useDailyNote, useNote } from '../entities/note/index.js'
import { NoteEditor } from '../features/notes/note-editor.js'
import { NoteSidebar } from '../features/notes/note-sidebar.js'
import { SidebarSlot } from '../shared/ui/sidebar-slot.js'

const COPY = {
  carregando: 'Abrindo…',
  erro: 'Não consegui abrir a nota.',
  citadaPor: 'Citada por',
  cita: 'Cita',
}

/** `AAAA-MM-DD` local — a nota do dia é do dia de quem escreve, não em UTC. */
function hojeLocal(): string {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')

  return `${agora.getFullYear()}-${mes}-${dia}`
}

export function NotesPage() {
  const [date] = useState(hojeLocal)
  const daily = useDailyNote(date)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Sem seleção explícita, a tela abre na nota do dia — é o que se quer ao entrar.
  const activeId = selectedId ?? daily.data?.id ?? null
  const note = useNote(activeId)

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <SidebarSlot>
        <NoteSidebar
          selectedId={activeId}
          dailyId={daily.data?.id ?? null}
          onSelect={setSelectedId}
        />
      </SidebarSlot>

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 pt-8 pb-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {note.isPending ? (
            <p role="status" aria-live="polite" className="text-ink-subtle text-sm">
              {COPY.carregando}
            </p>
          ) : note.isError || !note.data ? (
            <p role="alert" className="text-danger text-sm">
              {COPY.erro}
            </p>
          ) : (
            <>
              <h1 className="font-semibold text-ink text-xl">{note.data.title}</h1>

              <NoteEditor key={note.data.id} note={note.data} />

              {note.data.linksTo.length > 0 || note.data.linkedFrom.length > 0 ? (
                <div className="mt-6 flex flex-col gap-4 border-line border-t pt-4">
                  {note.data.linkedFrom.length > 0 ? (
                    <Relacionadas
                      titulo={COPY.citadaPor}
                      notas={note.data.linkedFrom}
                      onSelect={setSelectedId}
                    />
                  ) : null}

                  {note.data.linksTo.length > 0 ? (
                    <Relacionadas
                      titulo={COPY.cita}
                      notas={note.data.linksTo}
                      onSelect={setSelectedId}
                    />
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function Relacionadas({
  titulo,
  notas,
  onSelect,
}: {
  titulo: string
  notas: Array<{ id: string; title: string }>
  onSelect: (id: string) => void
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="font-medium text-ink-subtle text-xs uppercase tracking-wider">{titulo}</h2>

      <div className="flex flex-wrap gap-1.5">
        {notas.map((nota) => (
          <button
            key={nota.id}
            type="button"
            onClick={() => onSelect(nota.id)}
            className="rounded-control bg-surface-raised px-2 py-1 text-ink-muted text-xs transition-colors hover:text-ink"
          >
            {nota.title}
          </button>
        ))}
      </div>
    </section>
  )
}
