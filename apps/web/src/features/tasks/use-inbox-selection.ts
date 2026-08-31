import type { TaskView } from '@pauta/contracts'
import { useState } from 'react'

/**
 * Qual item continua selecionado depois que a fila muda.
 *
 * Processar tira o item da fila, e a pergunta é para onde a seleção vai. Voltar ao topo
 * a cada processamento faria a fila ser trabalhada sempre pelo primeiro item, perdendo
 * o lugar de quem está descendo por ela. Então a posição é que se mantém: sai o terceiro
 * item, entra o novo terceiro — o de baixo sobe para o cursor, como numa caixa de e-mail.
 *
 * A última posição da lista é o limite: esvaziar a fila devolve `null`, e é o estado
 * vazio que aparece.
 */
export function selectionAfterChange(
  ids: string[],
  selectedId: string | null,
  lastIndex: number,
): string | null {
  if (selectedId !== null && ids.includes(selectedId)) return selectedId
  if (ids.length === 0) return null

  return ids[Math.min(Math.max(lastIndex, 0), ids.length - 1)] ?? null
}

/**
 * A seleção da fila do inbox.
 *
 * Guarda o id **e** a posição em que ele foi escolhido, porque só o id não basta: no
 * instante em que ele deixa a fila, é a posição que diz qual item assume o lugar. Nada
 * de efeito colateral aqui — a seleção é derivada a cada render da fila que chegou.
 */
export function useInboxSelection(tasks: TaskView[]) {
  const [escolha, setEscolha] = useState<{ id: string; indice: number } | null>(null)

  const ids = tasks.map((task) => task.id)
  const id = selectionAfterChange(ids, escolha?.id ?? null, escolha?.indice ?? 0)

  function selecionar(novoId: string) {
    setEscolha({ id: novoId, indice: ids.indexOf(novoId) })
  }

  return [tasks.find((task) => task.id === id) ?? null, selecionar] as const
}
