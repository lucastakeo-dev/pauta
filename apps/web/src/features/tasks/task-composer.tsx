import { type FormEvent, useRef, useState } from 'react'
import { parsePriority } from '../../entities/task/index.js'
import { useCreateTask } from './queries.js'

const COPY = {
  placeholder: 'Nova tarefa… (P1 a P4 para prioridade)',
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const { title, priority } = parsePriority(value)
    if (!title) return

    // Limpa antes da resposta: quem digita rápido já quer registrar a próxima. Enquanto
    // isso, a lista mostra a tarefa a caminho — ela não some da tela.
    setValue('')

    try {
      await create.mutateAsync({
        title,
        priority,
        status: 'inbox',
        labelIds: [],
        ...(projectId ? { projectId } : {}),
      })
    } catch {
      // A mensagem vai no aviso, junto com as das outras ações. O que cabe ao campo é
      // devolver o que foi digitado, para a pessoa tentar de novo sem redigitar.
      setValue(title)
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
        className={[
          'h-9 w-full rounded-control border border-line bg-surface px-3 text-ink text-sm',
          'placeholder:text-ink-subtle',
          'transition-colors focus:border-iris',
        ].join(' ')}
      />
    </form>
  )
}
