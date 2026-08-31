import type { FormEvent, KeyboardEvent } from 'react'
import { useState } from 'react'
import {
  BLOCK_DURATIONS,
  blockGeometry,
  DEFAULT_BLOCK_MINUTES,
  durationLabel,
  fitBlockInDay,
  HOURS_IN_DAY,
  timeLabel,
} from '../../entities/planner/index.js'
import { cn } from '../../shared/lib/cn.js'
import { useCreateInSlot } from './queries.js'

const COPY = {
  cartao: 'Novo no calendário',
  titulo: 'Título',
  placeholder: 'Reunião, call, almoço…',
  compromisso: 'Compromisso',
  tarefa: 'Tarefa',
  duracao: 'Duração',
  criar: 'Criar',
  cancelar: 'Cancelar',
}

export type SlotKind = 'event' | 'task'

/** Altura aproximada do cartão, para decidir se ele abre para baixo ou para cima. */
const CARD_HEIGHT_PX = 150

/** Respiro entre o fantasma e o cartão. */
const CARD_GAP_PX = 6

type SlotComposerProps = {
  /** Início já encaixado, vindo do clique na grade. */
  start: Date
  day: Date
  hourHeight: number
  /** Na semana, as colunas da direita abrem o cartão para a esquerda. */
  alignRight?: boolean
  onClose: () => void
}

/**
 * O compositor que abre ao clicar num horário vazio.
 *
 * Clicar na grade é o gesto que todo calendário tem, e era o que faltava: dava para
 * arrastar uma tarefa que já existe, mas não para registrar a reunião que acabou de ser
 * marcada sem sair da tela. O bloco fantasma aparece no lugar exato antes de confirmar,
 * então o horário é conferido onde ele vai ficar — não num campo de formulário.
 *
 * Compromisso é o padrão: quem clica na agenda costuma estar marcando hora com alguém.
 * A alternativa é reservar tempo para uma tarefa, e aí ela nasce agendada e continua
 * na lista, com caixa de marcar.
 *
 * É atalho de ponteiro, não o único caminho: o `⌘K` cria com data em linguagem natural
 * ("reunião amanhã 14h"), e a lista tem "Agendar" para quem navega por teclado.
 */
export function SlotComposer({
  start,
  day,
  hourHeight,
  alignRight = false,
  onClose,
}: SlotComposerProps) {
  const create = useCreateInSlot()
  const [kind, setKind] = useState<SlotKind>('event')
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState<number>(DEFAULT_BLOCK_MINUTES)

  const { start: inicio, end: fim } = fitBlockInDay(start, minutes, day)

  // A mesma conta dos blocos de verdade: o fantasma tem de cair exatamente onde o
  // bloco vai nascer, senão o horário conferido antes não é o horário criado.
  const { top, height: altura } = blockGeometry({ startsAt: inicio, endsAt: fim }, day, hourHeight)

  // Perto do fim do dia não sobra altura abaixo do fantasma, e o cartão sairia da área
  // de 24h — que tem rolagem própria e o cortaria pela metade. Aí ele abre para cima.
  const abaixo = top + altura + CARD_GAP_PX
  const cabeAbaixo = abaixo + CARD_HEIGHT_PX <= HOURS_IN_DAY * hourHeight
  const cardTop = cabeAbaixo ? abaixo : Math.max(top - CARD_HEIGHT_PX - CARD_GAP_PX, 0)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const limpo = title.trim()
    if (!limpo) return

    await create.mutateAsync({ kind, title: limpo, start: inicio, end: fim })
    onClose()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape') return

    // Sem isto, o Esc sobe para a tela inteira e fecha o que estiver por trás.
    event.stopPropagation()
    onClose()
  }

  return (
    <>
      {/* O fantasma: o bloco que vai existir, já no lugar e com a duração escolhida. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-1 left-1 z-30 rounded-[6px] border border-iris border-dashed bg-iris/10"
        style={{ top, height: altura }}
      />

      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        aria-label={COPY.cartao}
        className={cn(
          'absolute z-40 flex w-60 flex-col gap-2 rounded-card border border-line',
          'bg-surface-overlay p-2.5 shadow-lg',
          alignRight ? 'right-1' : 'left-1',
        )}
        style={{ top: cardTop }}
      >
        {/* Os dois botões se explicam pelo texto, e `aria-pressed` diz qual está
            escolhido — um rótulo de grupo em volta seria uma terceira leitura sem
            informação nova. */}
        <div className="flex gap-1">
          <TipoBotao ativo={kind === 'event'} onClick={() => setKind('event')}>
            {COPY.compromisso}
          </TipoBotao>
          <TipoBotao ativo={kind === 'task'} onClick={() => setKind('task')}>
            {COPY.tarefa}
          </TipoBotao>
        </div>

        <input
          // biome-ignore lint/a11y/noAutofocus: o campo nasce do clique, então o foco é a intenção
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={COPY.placeholder}
          aria-label={COPY.titulo}
          className={cn(
            'h-8 w-full rounded-[8px] border border-line bg-surface px-2 text-ink text-sm',
            'outline-none transition-colors placeholder:text-ink-subtle focus:border-iris',
          )}
        />

        <div className="flex items-center gap-2">
          <span className="tabular shrink-0 text-ink-muted text-xs">
            {timeLabel(inicio)} – {timeLabel(fim)}
          </span>

          <select
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            aria-label={COPY.duracao}
            className="h-7 min-w-0 flex-1 rounded-[8px] border border-line bg-surface px-1.5 text-[13px] text-ink outline-none focus:border-iris"
          >
            {BLOCK_DURATIONS.map((valor) => (
              <option key={valor} value={valor}>
                {durationLabel(valor)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-2">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onClose}
              className="h-7 rounded-[8px] px-2 text-ink-muted text-xs transition-colors hover:bg-surface-raised hover:text-ink"
            >
              {COPY.cancelar}
            </button>

            <button
              type="submit"
              disabled={!title.trim() || create.isPending}
              aria-busy={create.isPending}
              className={cn(
                'h-7 rounded-[8px] bg-iris px-2.5 font-medium text-canvas text-xs',
                'transition-colors hover:bg-iris-strong',
                'disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-ink-subtle',
              )}
            >
              {COPY.criar}
            </button>
          </div>
        </div>
      </form>
    </>
  )
}

function TipoBotao({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={cn(
        'h-6 flex-1 rounded-[6px] text-xs transition-colors',
        ativo
          ? 'bg-surface-raised font-medium text-ink'
          : 'text-ink-subtle hover:bg-surface-raised hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
