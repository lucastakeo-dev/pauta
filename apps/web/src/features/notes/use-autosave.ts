import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { noteKeys, updateNote } from '../../entities/note/index.js'

/** Silêncio de digitação que dispara o salvamento. */
const IDLE_MS = 900

export type SaveState = 'idle' | 'pending' | 'saved' | 'error'

/**
 * Autosave do editor.
 *
 * Salva depois de uma pausa na digitação, não a cada tecla — uma requisição por
 * caractere entupiria a rede e o servidor sem nenhum ganho.
 *
 * Ao desmontar (trocar de nota, fechar a aba), o que estiver pendente é enviado na
 * hora: perder o último parágrafo por causa do temporizador seria o pior tipo de bug.
 */
export function useAutosave(noteId: string | null) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<SaveState>('idle')

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<unknown>(null)
  /** Impede dois salvamentos em voo: o segundo espera e leva a versão mais recente. */
  const inFlight = useRef(false)
  // Guardado em ref para o cleanup do efeito não depender do id e disparar cedo demais.
  const currentId = useRef(noteId)
  currentId.current = noteId

  const save = useMutation({
    mutationFn: ({ id, content }: { id: string; content: unknown }) =>
      updateNote(id, { contentJson: content as Record<string, unknown> }),
    onSuccess: (note) => {
      setState('saved')
      // O servidor devolve os links recalculados; a lista muda se uma nota nasceu.
      queryClient.setQueryData(noteKeys.detail(note.id), note)
      void queryClient.invalidateQueries({ queryKey: noteKeys.all })
    },
    onError: () => setState('error'),
  })

  const flush = useCallback(() => {
    const id = currentId.current
    const content = pending.current

    if (!id || content === null || inFlight.current) return

    pending.current = null
    inFlight.current = true

    save.mutate(
      { id, content },
      {
        onSettled: () => {
          inFlight.current = false

          // Digitou enquanto salvava: manda a versão mais nova em seguida.
          if (pending.current !== null) flushRef.current()
        },
      },
    )
  }, [save])

  // Referência estável para o `onSettled` acima poder se rechamar sem criar ciclo.
  const flushRef = useRef(flush)
  flushRef.current = flush

  const schedule = useCallback(
    (content: unknown) => {
      pending.current = content
      setState('pending')

      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, IDLE_MS)
    },
    [flush],
  )

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      // Não deixa a última edição para trás ao trocar de nota.
      flush()
    }
  }, [flush])

  return { schedule, flush, state }
}
