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

/**
 * Os projetos arquivados.
 *
 * Consulta própria, e não um parâmetro em `useProjects`: a lista normal é lida por três
 * telas e alimenta a barra lateral inteira, então trocar a chave dela por causa de um
 * botão faria as três buscarem de novo. Como `projectKeys.archived` começa com
 * `projectKeys.all`, invalidar a lista invalida esta junto.
 */
export function useArchivedProjects() {
  return useQuery({
    queryKey: projectKeys.archived,
    queryFn: async () =>
      (await listProjects(true)).filter((project) => project.archivedAt !== null),
  })
}
