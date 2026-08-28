import type { NoteView } from '@pauta/contracts'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { cn } from '../../shared/lib/cn.js'
import { type SaveState, useAutosave } from './use-autosave.js'

const COPY = {
  placeholder: 'Escreva aqui. Use [[nome]] para ligar a outra nota.',
  salvando: 'salvando…',
  salvo: 'salvo',
  erro: 'não salvou',
  conteudo: 'Conteúdo da nota',
}

const ESTADO: Record<SaveState, string> = {
  idle: '',
  pending: COPY.salvando,
  saved: COPY.salvo,
  error: COPY.erro,
}

type NoteEditorProps = {
  note: NoteView
}

/**
 * Editor da nota.
 *
 * Trocar de nota é resolvido por `key={note.id}` em quem renderiza, que remonta o
 * componente com o conteúdo novo. Sincronizar por efeito seria pior: `contentJson`
 * muda a cada autosave (o servidor devolve a nota), e reescrever o documento no meio
 * da digitação jogaria o cursor para o início.
 */
export function NoteEditor({ note }: NoteEditorProps) {
  const autosave = useAutosave(note.id)

  const editor = useEditor({
    extensions: [StarterKit],
    // `contentJson` vem `{}` numa nota nova, que o Tiptap não aceita como documento.
    content: isEmptyDoc(note.contentJson) ? '' : (note.contentJson as object),
    editorProps: {
      attributes: {
        'aria-label': COPY.conteudo,
        class: cn(
          'prose-editor min-h-[50vh] max-w-none outline-none',
          'text-ink text-sm leading-relaxed',
        ),
      },
    },
    onUpdate: ({ editor: instance }) => autosave.schedule(instance.getJSON()),
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-4 items-center justify-end">
        <span
          aria-live="polite"
          className={cn(
            'text-[11px] transition-colors',
            autosave.state === 'error' ? 'text-danger' : 'text-ink-subtle',
          )}
        >
          {ESTADO[autosave.state]}
        </span>
      </div>

      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <p className="text-ink-subtle text-sm">{COPY.placeholder}</p>
      )}
    </div>
  )
}

/** Nota nova chega com `{}`, que não é um documento válido para o editor. */
function isEmptyDoc(content: unknown): boolean {
  if (!content || typeof content !== 'object') return true
  return Object.keys(content).length === 0
}
