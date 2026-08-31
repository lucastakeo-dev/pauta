import type { TaskView } from '@pauta/contracts'
import { type FormEvent, useId, useState } from 'react'
import {
  BLOCK_DURATIONS,
  DEFAULT_BLOCK_MINUTES,
  durationInMinutes,
  durationLabel,
  fromDateTimeInputs,
  toDateInputValue,
  toTimeInputValue,
} from '../../entities/planner/index.js'
import { useUpdateTask } from './queries.js'

const COPY = {
  data: 'Data',
  hora: 'Início',
  duracao: 'Duração',
  salvar: 'Agendar',
  limpar: 'Tirar do planner',
  fechar: 'Cancelar',
  invalido: 'Informe data e hora.',
}

type TaskScheduleProps = {
  task: TaskView
  onClose: () => void
}

/**
 * Agendar por formulário, com campos nativos de data e hora.
 *
 * Existe porque arrastar é gesto de ponteiro: sem isto, quem navega por teclado ou usa
 * leitor de tela simplesmente não conseguiria pôr uma tarefa no planner. Também é mais
 * preciso que arrastar quando se quer um horário exato.
 */
export function TaskSchedule({ task, onClose }: TaskScheduleProps) {
  const update = useUpdateTask()
  const fieldId = useId()

  const inicio = task.scheduledStart ? new Date(task.scheduledStart) : null
  const fim = task.scheduledEnd ? new Date(task.scheduledEnd) : null

  const [date, setDate] = useState(() => toDateInputValue(inicio ?? new Date()))
  const [time, setTime] = useState(() => (inicio ? toTimeInputValue(inicio) : '09:00'))
  const [duration, setDuration] = useState(() =>
    inicio && fim ? durationInMinutes(inicio, fim) : (task.estimateMin ?? DEFAULT_BLOCK_MINUTES),
  )
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const start = fromDateTimeInputs(date, time)

    if (!start) {
      setError(COPY.invalido)
      return
    }

    const end = new Date(start.getTime() + duration * 60_000)

    await update.mutateAsync({
      id: task.id,
      input: { scheduledStart: start.toISOString(), scheduledEnd: end.toISOString() },
    })

    onClose()
  }

  async function handleClear() {
    // Os dois viram null juntos: o banco recusa bloco pela metade.
    await update.mutateAsync({
      id: task.id,
      input: { scheduledStart: null, scheduledEnd: null },
    })

    onClose()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-control bg-surface-raised p-2"
    >
      <Campo id={`${fieldId}-data`} label={COPY.data}>
        <input
          id={`${fieldId}-data`}
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="h-8 rounded-[4px] border border-line bg-surface px-2 text-ink text-xs outline-none focus:border-iris"
        />
      </Campo>

      <Campo id={`${fieldId}-hora`} label={COPY.hora}>
        <input
          id={`${fieldId}-hora`}
          type="time"
          step={900}
          value={time}
          onChange={(event) => setTime(event.target.value)}
          className="h-8 rounded-[4px] border border-line bg-surface px-2 text-ink text-xs outline-none focus:border-iris"
        />
      </Campo>

      <Campo id={`${fieldId}-duracao`} label={COPY.duracao}>
        <select
          id={`${fieldId}-duracao`}
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
          className="h-8 rounded-[4px] border border-line bg-surface px-2 text-ink text-xs outline-none focus:border-iris"
        >
          {BLOCK_DURATIONS.map((minutos) => (
            <option key={minutos} value={minutos}>
              {durationLabel(minutos)}
            </option>
          ))}
        </select>
      </Campo>

      <div className="flex items-center gap-1.5">
        <button
          type="submit"
          disabled={update.isPending}
          className="h-8 rounded-[4px] bg-iris px-3 font-medium text-canvas text-xs disabled:opacity-50"
        >
          {COPY.salvar}
        </button>

        {inicio ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={update.isPending}
            className="h-8 rounded-[4px] px-2 text-ink-subtle text-xs hover:text-danger disabled:opacity-50"
          >
            {COPY.limpar}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="h-8 rounded-[4px] px-2 text-ink-subtle text-xs hover:text-ink"
        >
          {COPY.fechar}
        </button>
      </div>

      {error ? (
        <p role="alert" className="w-full text-danger text-xs">
          {error}
        </p>
      ) : null}
    </form>
  )
}

function Campo({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[10px] text-ink-subtle uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}
