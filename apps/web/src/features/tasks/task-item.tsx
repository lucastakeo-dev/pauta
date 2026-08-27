import type { TaskView } from '@pauta/contracts'
import { type KeyboardEvent, useState } from 'react'
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

const COPY = {
  concluir: 'Concluir',
  remover: 'Remover tarefa',
  repete: 'Repete',
}

type TaskItemProps = {
  task: TaskView
}

export function TaskItem({ task }: TaskItemProps) {
  const toggle = useToggleTask()
  const update = useUpdateTask()
  const remove = useDeleteTask()

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)

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
      className={cn(
        'group flex items-start gap-3 rounded-control px-3 py-2.5 transition-colors',
        'hover:bg-surface',
      )}
    >
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
      </div>

      <button
        type="button"
        onClick={() => remove.mutate(task.id)}
        aria-label={`${COPY.remover}: ${task.title}`}
        className={cn(
          'shrink-0 rounded-control px-2 py-1 text-ink-subtle text-xs opacity-0 transition',
          'hover:bg-surface-raised hover:text-danger',
          'group-hover:opacity-100 focus-visible:opacity-100',
        )}
      >
        ✕
      </button>
    </li>
  )
}
