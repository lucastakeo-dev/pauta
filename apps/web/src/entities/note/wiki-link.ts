/**
 * Detecção do `[[` sendo digitado.
 *
 * O autocomplete precisa saber se o cursor está dentro de um link ainda aberto e qual
 * texto já foi escrito. Isolar isso numa função pura é o que permite testar os casos
 * chatos — colchete fechado, dois `[[` na mesma linha, quebra de linha no meio — sem
 * montar um editor.
 */

export type WikiLinkQuery = {
  /** O que foi digitado depois do `[[`. Vazio logo após abrir o colchete. */
  query: string
  /** Posição do primeiro `[` , para saber o que substituir ao escolher. */
  start: number
}

/**
 * Devolve o link aberto sob o cursor, ou `null`.
 *
 * Recebe apenas o texto **antes** do cursor: é o que define se o link está aberto.
 * Fechar o colchete encerra a busca, mesmo com o cursor logo depois.
 */
export function findWikiLinkQuery(textBeforeCursor: string): WikiLinkQuery | null {
  const start = textBeforeCursor.lastIndexOf('[[')

  if (start === -1) return null

  const query = textBeforeCursor.slice(start + 2)

  // Já fechou: não é mais uma busca em andamento.
  if (query.includes(']')) return null

  // Quebra de linha encerra — link não atravessa parágrafo, como na extração do servidor.
  if (query.includes('\n')) return null

  // Um `[[` colado em outro é digitação acidental, não busca.
  if (query.includes('[')) return null

  return { query, start }
}

/** Texto que substitui o trecho digitado ao escolher uma nota. */
export function completionFor(title: string): string {
  return `[[${title}]]`
}
