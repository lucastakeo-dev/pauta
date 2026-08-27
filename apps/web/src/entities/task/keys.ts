import type { ListTasksQuery } from '@pauta/contracts'

/**
 * Chaves de cache das tarefas. Moradas em `entities` pelo mesmo motivo das de evento:
 * a lista e o planner leem a mesma entidade, e precisam invalidar a mesma chave.
 *
 * As chaves são dado puro — os hooks que as consomem continuam em cada feature.
 */
export const taskKeys = {
  all: ['tasks'] as const,
  list: (query: Partial<ListTasksQuery>) => ['tasks', query] as const,
}
