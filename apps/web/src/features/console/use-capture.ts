import type { CreateTaskInput, LabelView, ProjectView } from '@pauta/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CaptureDraft } from '../../entities/capture/index.js'
import { createLabel, labelKeys, useLabels } from '../../entities/label/index.js'
import { createProject, projectKeys, useProjects } from '../../entities/project/index.js'
import { createTask, taskKeys } from '../../entities/task/index.js'
import { apiErrorDetail } from '../../shared/api/client.js'
import { useToast } from '../../shared/ui/toast.js'

const AVISOS = {
  capturar: { ok: 'Tarefa criada.', erro: 'Não consegui criar a tarefa.' },
}

/** Comparação de nome tolerante a acento e caixa — "casa" acha "Casa". */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function findByName<T extends { name: string }>(list: T[], name: string): T | undefined {
  const target = normalize(name)
  return list.find((item) => normalize(item.name) === target)
}

/**
 * Diz se `@projeto` e `#etiquetas` já existem, para a prévia avisar o que será criado.
 *
 * É a salvaguarda do atalho: criar na hora mantém o fluxo rápido, mas um erro de
 * digitação viraria projeto novo em silêncio. A tela mostra "novo" antes de confirmar.
 */
export function useCaptureResolution(draft: CaptureDraft): {
  projectIsNew: boolean
  newLabels: string[]
} {
  const { data: projects } = useProjects()
  const { data: labels } = useLabels()

  const projectIsNew = Boolean(
    draft.project && projects && !findByName(projects as ProjectView[], draft.project),
  )

  const newLabels = labels
    ? draft.labels.filter((name) => !findByName(labels as LabelView[], name))
    : []

  return { projectIsNew, newLabels }
}

/**
 * Cria a tarefa a partir do rascunho, resolvendo projeto e etiquetas.
 *
 * Projeto e etiqueta que não existem são criados na hora — parar para perguntar
 * mataria o propósito do console, que é registrar sem sair do fluxo.
 */
export function useCapture() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (draft: CaptureDraft) => {
      const [projects, labels] = await Promise.all([
        queryClient.ensureQueryData<ProjectView[]>({ queryKey: projectKeys.all }),
        queryClient.ensureQueryData<LabelView[]>({ queryKey: labelKeys.all }),
      ])

      let projectId: string | undefined

      if (draft.project) {
        const existing = findByName(projects, draft.project)
        projectId = existing
          ? existing.id
          : (await createProject({ name: draft.project, color: '#6E7BF2' })).id
      }

      const labelIds: string[] = []
      for (const name of draft.labels) {
        const existing = findByName(labels, name)
        labelIds.push(existing ? existing.id : (await createLabel({ name, color: '#8E8E93' })).id)
      }

      const input: CreateTaskInput = {
        title: draft.title,
        priority: draft.priority,
        status: 'inbox',
        labelIds,
        ...(projectId ? { projectId } : {}),
        // Sem horário explícito a data é prazo; com horário vira bloco na agenda.
        ...(draft.when.date && !draft.when.hasTime ? { dueAt: draft.when.date.toISOString() } : {}),
        ...(draft.when.date && draft.when.hasTime
          ? {
              scheduledStart: draft.when.date.toISOString(),
              scheduledEnd: new Date(draft.when.date.getTime() + 60 * 60_000).toISOString(),
            }
          : {}),
        ...(draft.when.rrule
          ? {
              recurrence: {
                rrule: draft.when.rrule,
                ...(draft.when.date ? { anchorAt: draft.when.date.toISOString() } : {}),
              },
            }
          : {}),
      }

      return createTask(input)
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all })
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
      void queryClient.invalidateQueries({ queryKey: labelKeys.all })
      toast.success(AVISOS.capturar.ok)
    },

    // O console fecha ao enviar. Sem este aviso, uma falha aconteceria fora da vista.
    onError: (cause) => toast.error(AVISOS.capturar.erro, { description: apiErrorDetail(cause) }),
  })
}
