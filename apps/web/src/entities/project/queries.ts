import { useQuery } from '@tanstack/react-query'
import { listProjects } from './api.js'
import { projectKeys } from './keys.js'

/**
 * Leitura da lista de projetos.
 *
 * Mora em `entities` porque duas features já a consomem — a lista de tarefas e o
 * console. Duplicar o hook faria cada uma criar sua própria entrada de cache.
 *
 * Só leitura vive aqui: mutação carrega decisão de o que invalidar, que é da feature.
 */
export function useProjects() {
  return useQuery({ queryKey: projectKeys.all, queryFn: () => listProjects() })
}
