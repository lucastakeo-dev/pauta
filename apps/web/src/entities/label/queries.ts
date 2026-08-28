import { useQuery } from '@tanstack/react-query'
import { listLabels } from './api.js'
import { labelKeys } from './keys.js'

/** Leitura da lista de etiquetas — consumida pela lista de tarefas e pelo console. */
export function useLabels() {
  return useQuery({ queryKey: labelKeys.all, queryFn: listLabels })
}
