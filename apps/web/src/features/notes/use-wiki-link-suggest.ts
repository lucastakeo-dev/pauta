import type { NoteRef } from '@pauta/contracts'
import type { Editor } from '@tiptap/react'
import { useCallback, useEffect, useState } from 'react'
import { completionFor, findWikiLinkQuery, listNotes } from '../../entities/note/index.js'

/** Quantas sugestões cabem sem virar lista de rolagem. */
const MAX_SUGGESTIONS = 6

export type SuggestState = {
  /** `null` quando não há `[[` aberto sob o cursor. */
  open: boolean
  query: string
  items: NoteRef[]
  activeIndex: number
  /** Coordenadas do cursor na tela, para posicionar o menu. */
  coords: { top: number; left: number } | null
}

const CLOSED: SuggestState = { open: false, query: '', items: [], activeIndex: 0, coords: null }

/**
 * Autocomplete do `[[`.
 *
 * O texto examinado é só o do bloco atual (`$from.parent`), não o documento inteiro:
 * assim as posições mapeiam direto, sem a conta de separador de bloco — e o link
 * naturalmente não atravessa parágrafo, igual à extração no servidor.
 */
export function useWikiLinkSuggest(editor: Editor | null) {
  const [state, setState] = useState<SuggestState>(CLOSED)

  const close = useCallback(() => setState(CLOSED), [])

  // Recalcula a cada mudança de texto ou de cursor.
  useEffect(() => {
    if (!editor) return

    let cancelled = false

    async function refresh() {
      if (!editor) return

      const { $from } = editor.state.selection
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, ' ')
      const match = findWikiLinkQuery(textBefore)

      if (!match) {
        setState((current) => (current.open ? CLOSED : current))
        return
      }

      const notes = await listNotes(match.query ? { search: match.query } : {}).catch(() => [])

      if (cancelled) return

      const coords = editor.view.coordsAtPos($from.pos)

      setState({
        open: true,
        query: match.query,
        items: notes.slice(0, MAX_SUGGESTIONS),
        // Volta ao topo a cada nova busca: manter a seleção antiga apontaria para
        // outra nota depois que a lista muda.
        activeIndex: 0,
        coords: { top: coords.bottom, left: coords.left },
      })
    }

    void refresh()
    editor.on('transaction', refresh)

    return () => {
      cancelled = true
      editor.off('transaction', refresh)
    }
  }, [editor])

  const move = useCallback((delta: number) => {
    setState((current) => {
      if (!current.open || current.items.length === 0) return current

      const total = current.items.length
      return { ...current, activeIndex: (current.activeIndex + delta + total) % total }
    })
  }, [])

  /**
   * Substitui o trecho digitado pelo link completo.
   *
   * Também aceita título que não existe ainda: o servidor cria a nota no save, e é
   * assim que se escreve primeiro e preenche depois.
   */
  const accept = useCallback(
    (title: string) => {
      if (!editor) return

      const { $from } = editor.state.selection
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, ' ')
      const match = findWikiLinkQuery(textBefore)

      if (!match) return

      const from = $from.start() + match.start
      const to = $from.pos

      editor.chain().focus().insertContentAt({ from, to }, completionFor(title)).run()
      close()
    },
    [editor, close],
  )

  const acceptActive = useCallback(() => {
    const item = state.items[state.activeIndex]

    // Sem sugestão selecionada, o que a pessoa digitou vira o título — a nota nasce
    // no save.
    const title = item?.title ?? state.query.trim()

    if (title) accept(title)
  }, [state, accept])

  return { state, move, accept, acceptActive, close }
}
