import type { KeyboardEvent } from 'react'
import { useState } from 'react'
import {
  blockGeometry,
  HOURS_IN_DAY,
  type LaidOutItem,
  timeLabel,
} from '../../entities/planner/index.js'
import { cn } from '../../shared/lib/cn.js'
import { useDeleteEvent, useUpdateEvent } from './queries.js'

const COPY = {
  titulo: 'Compromisso',
  nome: 'Título',
  excluir: 'Excluir',
  fechar: 'Fechar',
}

/** Altura aproximada do cartão, para decidir se ele abre para baixo ou para cima. */
const CARD_HEIGHT_PX = 110
const CARD_GAP_PX = 6

type EventPopoverProps = {
  item: LaidOutItem
  day: Date
  hourHeight: number
  alignRight?: boolean
  onClose: () => void
}

/**
 * O que dá para fazer com um compromisso, ali mesmo na grade.
 *
 * Renomear e excluir — o suficiente para o que nasce no calendário não virar um beco
 * sem saída. Mover e redimensionar continuam sendo do arrastar, e só para tarefa:
 * evento é hora marcada com alguém, e mudá-la é conversa, não gesto.
 */
export function EventPopover({ item, day, hourHeight, alignRight, onClose }: EventPopoverProps) {
  const update = useUpdateEvent()
  const remove = useDeleteEvent()
  const [title, setTitle] = useState(item.title)

  const { top, height } = blockGeometry(item, day, hourHeight)
  const abaixo = top + height + CARD_GAP_PX
  const cabeAbaixo = abaixo + CARD_HEIGHT_PX <= HOURS_IN_DAY * hourHeight
  const cardTop = cabeAbaixo ? abaixo : Math.max(top - CARD_HEIGHT_PX - CARD_GAP_PX, 0)

  function salvar() {
    const limpo = title.trim()

    if (!limpo || limpo === item.title) {
      setTitle(item.title)
      return
    }

    update.mutate({ id: item.id, title: limpo })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      salvar()
      onClose()
    }
  }

  return (
    <section
      aria-label={COPY.titulo}
      onKeyDown={handleKeyDown}
      className={cn(
        'absolute z-40 flex w-60 flex-col gap-2 rounded-card border border-line',
        'bg-surface-overlay p-2.5 shadow-lg',
        alignRight ? 'right-1' : 'left-1',
      )}
      style={{ top: cardTop }}
    >
      <input
        // biome-ignore lint/a11y/noAutofocus: o cartão só existe após o clique, então o foco é a intenção
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={salvar}
        aria-label={COPY.nome}
        className={cn(
          'h-8 w-full rounded-[8px] border border-line bg-surface px-2 text-ink text-sm',
          'outline-none transition-colors focus:border-iris',
        )}
      />

      <div className="flex items-center justify-between gap-2">
        <span className="tabular text-ink-muted text-xs">
          {timeLabel(item.startsAt)} – {timeLabel(item.endsAt)}
        </span>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={onClose}
            className="h-7 rounded-[8px] px-2 text-ink-muted text-xs transition-colors hover:bg-surface-raised hover:text-ink"
          >
            {COPY.fechar}
          </button>

          <button
            type="button"
            onClick={() => {
              remove.mutate(item.id)
              onClose()
            }}
            className={cn(
              'h-7 rounded-[8px] px-2 text-danger text-xs transition-colors',
              'hover:bg-danger/15',
            )}
          >
            {COPY.excluir}
          </button>
        </div>
      </div>
    </section>
  )
}
