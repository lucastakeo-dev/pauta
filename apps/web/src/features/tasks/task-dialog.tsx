import type { CreateTaskInput, TaskView } from '@pauta/contracts'
import { type FormEvent, type ReactNode, useState } from 'react'
import { dueLabel, isDone, PRIORITY_LABELS, timeRangeLabel } from '../../entities/task/index.js'
import { ApiRequestError } from '../../shared/api/client.js'
import { cn } from '../../shared/lib/cn.js'
import { Button } from '../../shared/ui/button.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../shared/ui/dialog.js'
import { NamedIcon } from '../../shared/ui/icon-catalog.js'
import { useCreateTask } from './queries.js'
import { TaskActions } from './task-actions.js'
import { TaskCampos } from './task-detail.js'
import { TaskFields, type TaskValues } from './task-fields.js'

const COPY = {
  detalhe: 'Detalhe da tarefa',
  detalheAjuda: 'Toda mudança é salva na hora.',
  semProjeto: 'Sem projeto',
  concluida: 'Concluída',
  nova: 'Nova tarefa',
  novaAjuda: 'O que a captura rápida não cobre: prazo, projeto, prioridade e etiquetas.',
  criar: 'Criar',
  cancelar: 'Cancelar',
  erro: 'Não consegui criar a tarefa.',
}

const RASCUNHO_VAZIO: TaskValues = {
  title: '',
  notes: '',
  priority: 4,
  projectId: null,
  dueAt: null,
  labelIds: [],
}

/**
 * A tarefa inteira num modal, aberta de qualquer lista.
 *
 * A tela do inbox já mostrava tudo isso, mas só lá: no resto do app, uma tarefa era uma
 * linha e o que não coubesse nela não existia. O modal é a mesma coisa sem precisar
 * mudar de tela — e é literalmente o mesmo componente de campos, então não há duas
 * verdades sobre o que uma tarefa tem.
 */
export function TaskDialog({
  task,
  open,
  onOpenChange,
}: {
  task: TaskView
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-3rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl"
        // Sem isto o Radix foca o título e ele abre com o texto selecionado, como se
        // estivesse esperando ser reescrito. Abrir é para ler; editar é o passo
        // seguinte, e quem quiser dá um clique no campo.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-line border-b px-5 py-3">
          <DialogTitle className="sr-only">{COPY.detalhe}</DialogTitle>
          <DialogDescription className="sr-only">{COPY.detalheAjuda}</DialogDescription>

          {/*
            A trilha diz de onde a tarefa vem — projeto, prazo, hora — porque no modal
            não há barra lateral nem lista em volta para dizer isso. É o contexto que a
            linha da lista dava e que some quando ela é aberta.
          */}
          <Trilha task={task} />
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <TaskCampos task={task} />
        </div>

        <DialogFooter className="border-line border-t px-5 py-3">
          <TaskActions task={task} onDepoisDeExcluir={() => onOpenChange(false)} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Trilha({ task }: { task: TaskView }) {
  const prazo = task.dueAt ? dueLabel(task.dueAt) : null
  const hora = timeRangeLabel(task)

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-ink-subtle text-xs">
      <span className="flex items-center gap-1.5">
        {task.project ? (
          <>
            <NamedIcon name={task.project.icon} className="size-3.5 shrink-0" />
            <span className="truncate">{task.project.name}</span>
          </>
        ) : (
          COPY.semProjeto
        )}
      </span>

      <Separador />
      <span>{PRIORITY_LABELS[task.priority]}</span>

      {prazo ? (
        <>
          <Separador />
          <span className="tabular">{prazo}</span>
        </>
      ) : null}

      {hora ? (
        <>
          <Separador />
          <span className="tabular">{hora}</span>
        </>
      ) : null}

      {isDone(task) ? (
        <>
          <Separador />
          <span className="text-positive">{COPY.concluida}</span>
        </>
      ) : null}
    </div>
  )
}

function Separador() {
  return (
    <span aria-hidden="true" className="text-ink-subtle/50">
      ·
    </span>
  )
}

/**
 * A criação com todos os campos.
 *
 * Não substitui o campo de uma linha, que continua sendo o caminho mais curto entre
 * pensar e registrar. Existe para o outro caso: quando já se sabe o projeto, o prazo e
 * a prioridade na hora de criar, e abrir a tarefa depois só para preencher é trabalho
 * repetido.
 */
export function NewTaskDialog({
  trigger,
  projectId,
  tituloInicial = '',
  onCriada,
}: {
  trigger: ReactNode
  /** Já vem preenchido quando a tela é de um projeto. */
  projectId?: string | undefined
  tituloInicial?: string
  onCriada?: () => void
}) {
  const create = useCreateTask()
  const [open, setOpen] = useState(false)
  const [valores, setValores] = useState<TaskValues>(RASCUNHO_VAZIO)
  const [erro, setErro] = useState<string | null>(null)

  function abrirOuFechar(proximo: boolean) {
    // Toda abertura parte de um rascunho limpo, com o que a tela já sabe. Sem isto,
    // cancelar uma criação e reabrir traria de volta o que foi descartado.
    setValores({ ...RASCUNHO_VAZIO, title: tituloInicial, projectId: projectId ?? null })
    setErro(null)
    setOpen(proximo)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = valores.title.trim()
    if (!title) return

    setErro(null)

    const input: CreateTaskInput = {
      title,
      notes: valores.notes || null,
      status: 'todo',
      priority: valores.priority,
      labelIds: valores.labelIds,
      dueAt: valores.dueAt,
      ...(valores.projectId ? { projectId: valores.projectId } : {}),
    }

    try {
      await create.mutateAsync(input)
      setOpen(false)
      onCriada?.()
    } catch (cause) {
      setErro(cause instanceof ApiRequestError ? cause.message : COPY.erro)
    }
  }

  return (
    <Dialog open={open} onOpenChange={abrirOuFechar}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-3rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <DialogHeader className="border-line border-b px-5 py-3">
            <DialogTitle>{COPY.nova}</DialogTitle>
            <DialogDescription>{COPY.novaAjuda}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {/*
              A tarefa ainda não existe, então nada aqui vai para o servidor: os campos
              escrevem num rascunho, e é por isso que o texto avisa a cada tecla — o
              botão de criar lê o mesmo estado que está sendo digitado.
            */}
            <TaskFields
              values={valores}
              onChange={(patch) => setValores((atual) => ({ ...atual, ...patch }))}
              onText={(patch) => setValores((atual) => ({ ...atual, ...patch }))}
              textoAoVivo
            />
          </div>

          <DialogFooter className="flex-col items-stretch gap-2 border-line border-t px-5 py-3 sm:flex-row sm:items-center sm:justify-end">
            {erro ? (
              <p role="alert" className={cn('flex-1 text-danger text-xs sm:text-left')}>
                {erro}
              </p>
            ) : null}

            <Button variant="ghost" onClick={() => setOpen(false)}>
              {COPY.cancelar}
            </Button>

            <Button type="submit" loading={create.isPending} disabled={!valores.title.trim()}>
              {COPY.criar}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
