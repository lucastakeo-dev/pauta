import { Plus } from 'lucide-react'
import { type FormEvent, useRef, useState } from 'react'
import { parsePriority } from '../../entities/task/index.js'
import { cn } from '../../shared/lib/cn.js'
import { Button } from '../../shared/ui/button.js'
import { useCreateTask } from './queries.js'
import { NewTaskDialog } from './task-dialog.js'

const COPY = {
  placeholder: 'Nova tarefa… (P1 a P4 para prioridade)',
  novaTarefa: 'Nova tarefa',
  novaTarefaAjuda: 'Criar com prazo, projeto, prioridade e etiquetas',
}

type TaskComposerProps = {
  projectId?: string | undefined
}

/**
 * Entrada rápida. É o caminho mais curto entre pensar e registrar, então some do
 * caminho: digitar e apertar Enter, sem modal.
 *
 * Ao lado dela, um botão com nome abre a criação completa. Ele já existiu como um ícone
 * escondido dentro do campo, e ninguém o achava — a tela parecia só aceitar tarefas de
 * uma linha. O botão não concorre com o campo: o que já estava digitado vai junto como
 * título, então as duas coisas são o mesmo gesto começando.
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
    /*
      O modal fica FORA do formulário, e isso não é arrumação.

      O `DialogContent` do Radix vai para um portal no fim do body, mas evento de portal
      borbulha pela árvore do React, não pela do DOM: com o gatilho dentro do `<form>`,
      o submit do modal subia até aqui e a entrada rápida criava uma segunda tarefa —
      com o mesmo título, sem projeto e sem prioridade. Dois registros por um clique.
    */
    <div className="flex items-center gap-2">
      <form onSubmit={handleSubmit} className="min-w-0 flex-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={COPY.placeholder}
          aria-label="Nova tarefa"
          className={cn(
            'h-9 w-full rounded-control border border-line bg-surface px-3 text-ink text-sm',
            'placeholder:text-ink-subtle',
            'transition-colors focus:border-iris',
          )}
        />
      </form>

      <NewTaskDialog
        projectId={projectId}
        tituloInicial={value}
        onCriada={() => setValue('')}
        trigger={
          // Mesma altura do campo: os dois formam uma linha só, não um campo com um
          // botão de outro lugar encostado nele.
          <Button className="h-9 shrink-0 px-3" title={COPY.novaTarefaAjuda}>
            <Plus aria-hidden="true" className="size-4" />
            {COPY.novaTarefa}
          </Button>
        }
      />
    </div>
  )
}
