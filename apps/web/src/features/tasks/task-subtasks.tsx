import type { TaskView } from '@pauta/contracts'
import { Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { isDone } from '../../entities/task/index.js'
import { cn } from '../../shared/lib/cn.js'
import { Checkbox } from '../../shared/ui/checkbox.js'
import { useCreateTask, useDeleteTask, useTasks, useToggleTask } from './queries.js'

const COPY = {
  titulo: 'Subtarefas',
  nova: 'Nova subtarefa',
  placeholder: 'Dividir em um passo…',
  concluir: 'Concluir',
  remover: 'Remover subtarefa',
  progresso: 'concluídas',
}

/**
 * As subtarefas de uma tarefa, com o progresso em cima.
 *
 * O banco e a API já sabiam disso desde o começo — `parentId`, e a contagem de
 * concluídas vem junto de toda tarefa. Faltava a tela: dava para ver "2/5" na linha da
 * lista e não havia lugar nenhum para criar a terceira.
 *
 * A barra existe porque contar não é ver: "3 de 7" diz o mesmo que a barra, mas a barra
 * responde antes de ser lida — e é ela que mostra que a tarefa andou desde ontem.
 */
export function TaskSubtasks({ task }: { task: TaskView }) {
  const { data: subtarefas, isPending } = useTasks({ parentId: task.id, includeDone: true })
  const create = useCreateTask()
  const toggle = useToggleTask()
  const remove = useDeleteTask()

  const [titulo, setTitulo] = useState('')

  const lista = subtarefas ?? []
  const concluidas = lista.filter(isDone).length
  const proporcao = lista.length > 0 ? (concluidas / lista.length) * 100 : 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const limpo = titulo.trim()
    if (!limpo) return

    // Limpa antes da resposta: quem está dividindo uma tarefa costuma escrever os
    // passos em sequência, e esperar o servidor entre um e outro quebra o ritmo.
    setTitulo('')

    await create.mutateAsync({
      title: limpo,
      parentId: task.id,
      status: 'todo',
      priority: 4,
      labelIds: [],
    })
  }

  return (
    <section className="flex flex-col gap-2 pt-2">
      <div className="flex items-center gap-3">
        <span className="font-medium text-[11px] text-ink-subtle">{COPY.titulo}</span>

        {lista.length > 0 ? (
          <>
            <span className="tabular text-[11px] text-ink-subtle">
              {concluidas} de {lista.length}
            </span>

            {/* A barra é decorativa: o número ao lado já diz o mesmo, e um leitor de
                tela lendo "56 por cento" depois de "3 de 7" seria a mesma coisa duas
                vezes. */}
            <span
              aria-hidden="true"
              className="h-1 max-w-32 flex-1 overflow-hidden rounded-full bg-surface-raised"
            >
              <span
                className="block h-full rounded-full bg-iris transition-[width] duration-300 ease-entrance"
                style={{ width: `${proporcao}%` }}
              />
            </span>
          </>
        ) : null}
      </div>

      {!isPending && lista.length > 0 ? (
        <ul className="flex flex-col">
          {lista.map((subtarefa) => {
            const feita = isDone(subtarefa)

            return (
              <li
                key={subtarefa.id}
                className="group -ml-1 flex h-8 items-center gap-2 rounded-[6px] px-1 transition-colors hover:bg-surface-raised/60"
              >
                <Checkbox
                  checked={feita}
                  onChange={(checked) => toggle.mutate({ id: subtarefa.id, done: checked })}
                  label={`${COPY.concluir} ${subtarefa.title}`}
                  className="shrink-0"
                />

                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm',
                    feita ? 'text-ink-subtle line-through' : 'text-ink',
                  )}
                >
                  {subtarefa.title}
                </span>

                <button
                  type="button"
                  onClick={() => remove.mutate(subtarefa.id)}
                  aria-label={`${COPY.remover}: ${subtarefa.title}`}
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-[6px] text-ink-subtle',
                    'opacity-0 transition hover:text-danger group-hover:opacity-100',
                    'focus-visible:opacity-100',
                  )}
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      <form onSubmit={handleSubmit}>
        <input
          value={titulo}
          onChange={(event) => setTitulo(event.target.value)}
          placeholder={COPY.placeholder}
          aria-label={COPY.nova}
          className={cn(
            '-ml-2 h-8 w-full rounded-[8px] border border-transparent bg-transparent px-2',
            'text-ink text-sm outline-none placeholder:text-ink-subtle',
            'transition-colors hover:border-line focus:border-iris',
          )}
        />
      </form>
    </section>
  )
}
