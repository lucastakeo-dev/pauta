import { type FormEvent, useRef, useState } from 'react'
import { parsePriority } from '../../entities/task/index.js'
import { ApiRequestError } from '../../shared/api/client.js'
import { cn } from '../../shared/lib/cn.js'
import { useCreateTask } from './queries.js'

const COPY = {
  placeholder: 'Nova tarefa… (P1 a P4 para prioridade)',
  erro: 'Não consegui salvar a tarefa.',
}

type TaskComposerProps = {
  projectId?: string | undefined
}

/**
 * Entrada rápida. É o caminho mais curto entre pensar e registrar, então some do
 * caminho: sem botão, sem modal — digitar e apertar Enter.
 *
 * É também o embrião do Console da Fase 3, que fará isso com data em linguagem natural.
 */
export function TaskComposer({ projectId }: TaskComposerProps) {
  const create = useCreateTask()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const { title, priority } = parsePriority(value)
    if (!title) return

    setError(null)
    // Limpa antes da resposta: quem digita rápido já quer registrar a próxima.
    setValue('')

    try {
      await create.mutateAsync({
        title,
        priority,
        status: 'inbox',
        labelIds: [],
        ...(projectId ? { projectId } : {}),
      })
    } catch (cause) {
      setValue(title)
      setError(cause instanceof ApiRequestError ? cause.message : COPY.erro)
    } finally {
      inputRef.current?.focus()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={COPY.placeholder}
        aria-label="Nova tarefa"
        aria-invalid={error ? true : undefined}
        className={cn(
          'h-11 w-full rounded-control border bg-surface px-3.5 text-ink text-sm',
          'placeholder:text-ink-subtle',
          'transition-colors focus:border-iris',
          error ? 'border-danger' : 'border-line',
        )}
      />

      {error ? (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : null}
    </form>
  )
}
