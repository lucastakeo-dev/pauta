import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type PointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import { blockGeometry, type PlannerItem, resizeEnd } from '../../entities/planner/index.js'
import { taskKeys, updateTask } from '../../entities/task/index.js'

type UseResizeBlockOptions = {
  item: PlannerItem
  day: Date
  hourHeight: number
  enabled: boolean
}

/**
 * Redimensionar pela borda de baixo.
 *
 * Feito com eventos de ponteiro, não com o dnd-kit: o dnd-kit modela "pegar e soltar
 * em outro lugar", e esticar é outro gesto — o bloco não sai do lugar, só muda de
 * tamanho. Forçá-lo no mesmo modelo confundiria os dois.
 *
 * Enquanto o gesto acontece, a altura vem do estado local; o servidor só é avisado ao
 * soltar. Assim a borda acompanha o dedo sem uma requisição por pixel.
 */
export function useResizeBlock({ item, day, hourHeight, enabled }: UseResizeBlockOptions) {
  const queryClient = useQueryClient()
  const [previewEnd, setPreviewEnd] = useState<Date | null>(null)
  const gridTopRef = useRef(0)

  const save = useMutation({
    mutationFn: (end: Date) =>
      updateTask(item.id, {
        scheduledStart: item.startsAt.toISOString(),
        scheduledEnd: end.toISOString(),
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enabled) return

      event.preventDefault()
      event.stopPropagation()

      // Guardamos o topo da área de 24h para converter Y da tela em Y da grade.
      const grid = event.currentTarget.closest('[data-planner-grid]')
      gridTopRef.current = grid?.getBoundingClientRect().top ?? 0

      setPreviewEnd(item.endsAt)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [enabled, item.endsAt],
  )

  // Os ouvintes ficam na janela: o ponteiro costuma sair do bloco durante o gesto, e
  // ouvintes presos ao elemento perderiam o movimento.
  useEffect(() => {
    if (previewEnd === null) return

    function handleMove(event: globalThis.PointerEvent) {
      const offsetY = event.clientY - gridTopRef.current
      setPreviewEnd(resizeEnd(item.startsAt, offsetY, day, hourHeight))
    }

    function handleUp() {
      setPreviewEnd((current) => {
        if (current && current.getTime() !== item.endsAt.getTime()) {
          save.mutate(current)
        }
        return null
      })
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [previewEnd, item.startsAt, item.endsAt, day, hourHeight, save])

  const previewHeight =
    previewEnd === null
      ? null
      : blockGeometry({ startsAt: item.startsAt, endsAt: previewEnd }, day, hourHeight).height

  return { onPointerDown, previewEnd, previewHeight }
}
