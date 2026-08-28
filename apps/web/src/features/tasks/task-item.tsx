import { useDraggable } from '@dnd-kit/core'
import type { TaskView } from '@pauta/contracts'
import { type KeyboardEvent, useState } from 'react'
import { DEFAULT_BLOCK_MINUTES, type DragPayload } from '../../entities/planner/index.js'
import {
  dueLabel,
  isDone,
  isOverdue,
  PRIORITY_LABELS,
  priorityColorClass,
  timeRangeLabel,
} from '../../entities/task/index.js'
import { cn } from '../../shared/lib/cn.js'
import { Checkbox } from '../../shared/ui/checkbox.js'
import { useDeleteTask, useToggleTask, useUpdateTask } from './queries.js'
import { TaskSchedule } from './task-schedule.js'

const COPY = {
  concluir: 'Concluir',
  remover: 'Remover tarefa',
  repete: 'Repete',
  arrastar: 'Arrastar para o planner',
  agendar: 'Agendar',
}

type TaskItemProps = {
  task: TaskView
}

export function TaskItem({ task }: TaskItemProps) {
  const toggle = useToggleTask()
  const update = useUpdateTask()
  const remove = useDeleteTask()

  const [editing, setEditing] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [draft, setDraft] = useState(task.title)

  // O payload é o contrato com a grade — definido em `entities`, para as duas features
  // concordarem sem uma importar a outra.
  const payload: DragPayload = {
    kind: 'task',
    taskId: task.id,
    durationMinutes: task.estimateMin ?? DEFAULT_BLOCK_MINUTES,
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: payload,
  })

  const done = isDone(task)
  const overdue = isOverdue(task)
  const timeRange = timeRangeLabel(task)

  function commit() {
    const title = draft.trim()
    setEditing(false)

    // Título vazio significa desistir da edição, não apagar a tarefa.
    if (!title || title === task.title) {
      setDraft(task.title)
      return
    }

    update.mutate({ id: task.id, input: { title } })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') commit()
    if (event.key === 'Escape') {
      setDraft(task.title)
      setEditing(false)
    }
  }

  return (
    <li
      ref={setNodeRef}
      className={cn(
        'group flex items-start gap-3 rounded-control px-3 py-2.5 transition-colors',
        'hover:bg-surface',
        isDragging && 'opacity-40',
      )}
    >
      {/*
        Alça dedicada em vez de arrastar a linha inteira: assim o arrasto nunca disputa
        o ponteiro com a caixa de marcar, o título editável e o botão de remover.
      */}
      <button
        type="button"
        aria-label={`${COPY.arrastar}: ${task.title}`}
        className={cn(
          'mt-0.5 shrink-0 cursor-grab rounded-[4px] px-0.5 text-ink-subtle text-xs',
          'opacity-0 transition duration-150 ease-press hover:text-ink group-hover:opacity-100 focus-visible:opacity-100',
          'active:cursor-grabbing',
        )}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <span
        aria-hidden="true"
        title={PRIORITY_LABELS[task.priority]}
        className={cn('mt-[7px] size-1.5 shrink-0 rounded-full', priorityColorClass(task.priority))}
      />

      <div className="mt-px">
        <Checkbox
          checked={done}
          onChange={(checked) => toggle.mutate({ id: task.id, done: checked })}
          label={`${COPY.concluir} ${task.title}`}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {editing ? (
          <input
            // biome-ignore lint/a11y/noAutofocus: o campo só existe após o clique de editar, então o foco é a intenção
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            className="w-full rounded-[4px] bg-surface-raised px-1 py-0.5 text-ink text-sm outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn(
              'text-left text-sm transition-colors',
              done ? 'text-ink-subtle line-through' : 'text-ink',
            )}
          >
            {task.title}
          </button>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {task.project ? (
            <span className="flex items-center gap-1.5 text-ink-subtle">
              <span
                aria-hidden="true"
                className="size-2 rounded-[3px]"
                style={{ backgroundColor: task.project.color }}
              />
              {task.project.name}
            </span>
          ) : null}

          {timeRange ? <span className="tabular text-ink-subtle">{timeRange}</span> : null}

          {task.dueAt ? (
            <span className={cn('tabular', overdue ? 'text-danger' : 'text-ink-subtle')}>
              {dueLabel(task.dueAt)}
            </span>
          ) : null}

          {task.recurrence ? (
            <span className="text-ink-subtle" title={`${COPY.repete} ${task.recurrence.summary}`}>
              ↻ {task.recurrence.summary}
            </span>
          ) : null}

          {task.subtaskCount > 0 ? (
            <span className="tabular text-ink-subtle">
              {task.completedSubtaskCount}/{task.subtaskCount}
            </span>
          ) : null}

          {task.labels.map((label) => (
            <span key={label.id} className="text-ink-subtle" style={{ color: label.color }}>
              #{label.name}
            </span>
          ))}
        </div>

        {scheduling ? <TaskSchedule task={task} onClose={() => setScheduling(false)} /> : null}
      </div>

      {/*
        Caminho de teclado para agendar. Arrastar é gesto de ponteiro: sem este botão,
        quem não usa mouse não conseguiria pôr a tarefa no planner.
      */}
      <button
        type="button"
        onClick={() => setScheduling((open) => !open)}
        aria-expanded={scheduling}
        aria-label={`${COPY.agendar}: ${task.title}`}
        className={cn(
          'shrink-0 rounded-control px-2 py-1 text-xs',
          'transition duration-150 ease-press hover:bg-surface-raised hover:text-ink active:scale-90',
          scheduling
            ? 'text-iris opacity-100'
            : 'text-ink-subtle opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
        )}
      >
        🕑
      </button>

      <button
        type="button"
        onClick={() => remove.mutate(task.id)}
        aria-label={`${COPY.remover}: ${task.title}`}
        className={cn(
          'shrink-0 rounded-control px-2 py-1 text-ink-subtle text-xs opacity-0',
          'transition duration-150 ease-press hover:bg-surface-raised hover:text-danger active:scale-90',
          'group-hover:opacity-100 focus-visible:opacity-100',
        )}
      >
        ✕
      </button>
    </li>
  )
}
