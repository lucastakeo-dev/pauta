import type { TaskView } from '@pauta/contracts'
import { type ReactNode, useId, useState } from 'react'
import { useLabels } from '../../entities/label/index.js'
import { toDateInputValue } from '../../entities/planner/index.js'
import { buildProjectTree, flattenProjectTree, useProjects } from '../../entities/project/index.js'
import { PRIORITY_LABELS, priorityColorClass } from '../../entities/task/index.js'
import { cn } from '../../shared/lib/cn.js'
import { NamedIcon } from '../../shared/ui/icon-catalog.js'

const COPY = {
  titulo: 'Título',
  tituloVazio: 'O que precisa ser feito?',
  anotacao: 'Anotação',
  anotacaoVazia: 'Escreva o que precisa lembrar sobre isto…',
  propriedades: 'Propriedades',
  prioridade: 'Prioridade',
  projeto: 'Projeto',
  semProjeto: 'Sem projeto',
  prazo: 'Prazo',
  etiquetas: 'Etiquetas',
  semEtiquetas: 'Nenhuma etiqueta criada ainda.',
}

const PRIORIDADES = [1, 2, 3, 4] as const

/** Os campos de uma tarefa, sem dizer se ela já existe. */
export type TaskValues = {
  title: string
  notes: string
  priority: number
  projectId: string | null
  /** ISO, como a API guarda. `null` é sem prazo. */
  dueAt: string | null
  labelIds: string[]
}

/** Os valores de uma tarefa que já existe, no formato dos campos. */
export function valuesOf(task: TaskView): TaskValues {
  return {
    title: task.title,
    notes: task.notes ?? '',
    priority: task.priority,
    projectId: task.projectId,
    dueAt: task.dueAt,
    labelIds: task.labels.map((label) => label.id),
  }
}

type TaskFieldsProps = {
  values: TaskValues
  /** Prioridade, projeto, prazo e etiquetas — mudam de uma vez só. */
  onChange: (patch: Partial<TaskValues>) => void
  /**
   * Título e anotação.
   *
   * Quando `textoAoVivo`, avisa a cada tecla: é o que um rascunho precisa, porque o
   * botão de criar lê o mesmo estado. Sem ele, avisa ao sair do campo — uma tarefa que
   * já existe salva no servidor, e uma requisição por letra digitada encheria a fila de
   * escritas e a tela de avisos.
   */
  onText: (patch: { title?: string; notes?: string }) => void
  textoAoVivo?: boolean
  /** O campo do planner. Só existe para tarefa que já tem id. */
  planner?: ReactNode
  /** As subtarefas, embaixo da anotação. Também só para tarefa que já existe. */
  progresso?: ReactNode
  /** Rasura o título quando a tarefa está concluída. */
  concluida?: boolean
}

/**
 * Os campos de uma tarefa: o que se lê e escreve à esquerda, o que se decide à direita.
 *
 * Mora fora do detalhe e do modal porque os dois mostram exatamente isto — e uma
 * segunda cópia começaria igual e divergiria no primeiro campo novo. O que muda entre
 * eles é para onde a mudança vai: no detalhe, direto para o servidor; na criação, para
 * um rascunho que só existe enquanto o modal está aberto.
 */
export function TaskFields({
  values,
  onChange,
  onText,
  textoAoVivo = false,
  planner,
  progresso,
  concluida = false,
}: TaskFieldsProps) {
  const campoId = useId()

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="flex min-w-0 flex-col gap-3 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
        <label htmlFor={`${campoId}-titulo`} className="sr-only">
          {COPY.titulo}
        </label>
        <TextoAutoSalvo
          id={`${campoId}-titulo`}
          value={values.title}
          placeholder={COPY.tituloVazio}
          aoVivo={textoAoVivo}
          onCommit={(title) => onText({ title })}
          className={cn(
            'w-full rounded-control border border-transparent bg-transparent px-2 py-1',
            '-ml-2 font-semibold text-ink text-lg outline-none',
            'transition-colors hover:border-line focus:border-iris',
            concluida && 'line-through',
          )}
        />

        <label htmlFor={`${campoId}-notas`} className="sr-only">
          {COPY.anotacao}
        </label>
        <TextoAutoSalvo
          id={`${campoId}-notas`}
          multilinha
          value={values.notes}
          placeholder={COPY.anotacaoVazia}
          aoVivo={textoAoVivo}
          onCommit={(notes) => onText({ notes })}
          className={cn(
            '-ml-2 min-h-32 w-full flex-1 resize-none rounded-control border border-transparent',
            'bg-transparent px-2 py-1.5 text-ink text-sm leading-relaxed outline-none',
            'placeholder:text-ink-subtle',
            'transition-colors hover:border-line focus:border-iris',
          )}
        />

        {progresso}
      </div>

      <aside
        aria-label={COPY.propriedades}
        className="flex min-w-0 flex-col gap-5 overflow-y-auto border-line px-5 py-6 lg:border-l"
      >
        <Campo rotulo={COPY.prioridade}>
          <div className="flex gap-1">
            {PRIORIDADES.map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => onChange({ priority: valor })}
                aria-pressed={values.priority === valor}
                title={PRIORITY_LABELS[valor]}
                className={cn(
                  'flex h-7 flex-1 items-center justify-center gap-1 rounded-[8px] text-xs',
                  'transition-colors',
                  values.priority === valor
                    ? 'bg-surface-raised font-medium text-ink'
                    : 'text-ink-subtle hover:bg-surface-raised hover:text-ink',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn('size-1.5 rounded-full', priorityColorClass(valor))}
                />
                P{valor}
              </button>
            ))}
          </div>
        </Campo>

        <ProjetoCampo
          projectId={values.projectId}
          onChange={(projectId) => onChange({ projectId })}
        />

        <Campo rotulo={COPY.prazo}>
          <input
            type="date"
            value={values.dueAt ? toDateInputValue(new Date(values.dueAt)) : ''}
            onChange={(event) =>
              onChange({
                // O campo nativo devolve `AAAA-MM-DD`; meio-dia local evita que o fuso
                // empurre o prazo para o dia anterior ao virar ISO.
                dueAt: event.target.value
                  ? new Date(`${event.target.value}T12:00`).toISOString()
                  : null,
              })
            }
            className="h-8 w-full rounded-[8px] border border-line bg-surface px-2 text-[13px] text-ink outline-none focus:border-iris"
          />
        </Campo>

        {planner}

        <EtiquetasCampo
          labelIds={values.labelIds}
          onChange={(labelIds) => onChange({ labelIds })}
        />
      </aside>
    </div>
  )
}

/**
 * Campo de texto que decide sozinho quando avisar.
 *
 * O estado do que está sendo digitado é local: sem isso, cada tecla passaria pelo pai e
 * o cursor pularia para o fim a cada render.
 */
function TextoAutoSalvo({
  id,
  value,
  placeholder,
  aoVivo,
  onCommit,
  className,
  multilinha = false,
}: {
  id: string
  value: string
  placeholder: string
  aoVivo: boolean
  onCommit: (valor: string) => void
  className: string
  multilinha?: boolean
}) {
  const [rascunho, setRascunho] = useState(value)

  const aoDigitar = (proximo: string) => {
    setRascunho(proximo)
    if (aoVivo) onCommit(proximo)
  }

  const props = {
    id,
    value: rascunho,
    placeholder,
    className,
    onChange: (event: { target: { value: string } }) => aoDigitar(event.target.value),
    onBlur: () => {
      if (!aoVivo && rascunho !== value) onCommit(rascunho)
    },
  }

  if (multilinha) return <textarea {...props} />

  return (
    <input
      {...props}
      // Enter numa linha só é "terminei de escrever": tira o foco, e sair do campo é o
      // que salva. Sem isto, quem digita e aperta Enter — que é como se renomeia em
      // qualquer lista — ficaria olhando para um texto que não foi para lugar nenhum.
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
    />
  )
}

export function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-[11px] text-ink-subtle">{rotulo}</span>
      {children}
    </div>
  )
}

function ProjetoCampo({
  projectId,
  onChange,
}: {
  projectId: string | null
  onChange: (projectId: string | null) => void
}) {
  const { data: projects } = useProjects()
  const arvore = buildProjectTree(projects ?? [])
  const linhas = flattenProjectTree(arvore)
  const escolhido = linhas.find((node) => node.id === projectId)

  return (
    <Campo rotulo={COPY.projeto}>
      <div className="flex items-center gap-2">
        {escolhido ? (
          <NamedIcon name={escolhido.icon} className="size-4 shrink-0 text-ink-muted" />
        ) : null}

        <select
          value={projectId ?? ''}
          onChange={(event) => onChange(event.target.value || null)}
          aria-label={COPY.projeto}
          className="h-8 min-w-0 flex-1 rounded-[8px] border border-line bg-surface px-2 text-[13px] text-ink outline-none focus:border-iris"
        >
          <option value="">{COPY.semProjeto}</option>
          {linhas.map((node) => (
            <option key={node.id} value={node.id}>
              {/* O recuo vai no texto: `option` não aceita marcação, e sem ele a lista
                  plana perde a hierarquia que a barra mostra. */}
              {'— '.repeat(node.depth)}
              {node.name}
            </option>
          ))}
        </select>
      </div>
    </Campo>
  )
}

function EtiquetasCampo({
  labelIds,
  onChange,
}: {
  labelIds: string[]
  onChange: (labelIds: string[]) => void
}) {
  const { data: labels } = useLabels()
  const atuais = new Set(labelIds)

  if (!labels || labels.length === 0) {
    return (
      <Campo rotulo={COPY.etiquetas}>
        <p className="text-ink-subtle text-xs">{COPY.semEtiquetas}</p>
      </Campo>
    )
  }

  return (
    <Campo rotulo={COPY.etiquetas}>
      <div className="flex flex-wrap gap-1">
        {labels.map((label) => {
          const marcada = atuais.has(label.id)

          return (
            <button
              key={label.id}
              type="button"
              aria-pressed={marcada}
              onClick={() =>
                onChange(
                  marcada ? [...atuais].filter((id) => id !== label.id) : [...atuais, label.id],
                )
              }
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors',
                marcada
                  ? 'bg-surface-raised text-ink'
                  : 'text-ink-subtle hover:bg-surface-raised hover:text-ink',
              )}
            >
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-[3px]"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
            </button>
          )
        })}
      </div>
    </Campo>
  )
}
