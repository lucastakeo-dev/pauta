import type { LabelView, ProjectView, TaskView } from '@pauta/contracts'
import type { LabelRecord } from '../models/label.model.js'
import type { ProjectRecord } from '../models/project.model.js'
import type { TaskRecord } from '../models/task.model.js'

/**
 * Views do domínio de tarefas.
 *
 * Mapeamento explícito, campo a campo: coluna nova no banco só aparece na API se
 * alguém escrever a linha aqui. É o que impede vazamento acidental a cada migration.
 */

function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null
}

export function renderLabel(label: LabelRecord): LabelView {
  return { id: label.id, name: label.name, color: label.color }
}

export function renderLabels(labels: LabelRecord[]): LabelView[] {
  return labels.map(renderLabel)
}

export function renderProject(project: ProjectRecord): ProjectView {
  return {
    id: project.id,
    name: project.name,
    color: project.color,
    icon: project.icon,
    position: project.position,
    archivedAt: iso(project.archivedAt),
    openTaskCount: project.openTaskCount,
  }
}

export function renderProjects(projects: ProjectRecord[]): ProjectView[] {
  return projects.map(renderProject)
}

export function renderTask(task: TaskRecord): TaskView {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    status: task.status,
    priority: task.priority,
    dueAt: iso(task.dueAt),
    scheduledStart: iso(task.scheduledStart),
    scheduledEnd: iso(task.scheduledEnd),
    estimateMin: task.estimateMin,
    completedAt: iso(task.completedAt),
    projectId: task.projectId,
    project: task.project,
    parentId: task.parentId,
    labels: task.labels,
    subtaskCount: task.subtaskCount,
    completedSubtaskCount: task.completedSubtaskCount,
    recurrence: task.recurrence,
    occurrenceOn: task.occurrenceOn,
    isVirtual: task.isVirtual,
    position: task.position,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

export function renderTasks(tasks: TaskRecord[]): TaskView[] {
  return tasks.map(renderTask)
}
