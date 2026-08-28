/**
 * Extração dos `[[links]]` do conteúdo da nota.
 *
 * O documento do editor chega como JSON e a API **não conhece o formato**. Em vez de
 * modelar a árvore do Tiptap, percorremos qualquer estrutura recolhendo os campos
 * `text` — assim trocar de editor não vira migration nem quebra os backlinks.
 *
 * Funções puras: dá para testar sem banco, e é onde mora a única regra sutil aqui
 * (dois `[[Casa]]` na mesma nota são um link só).
 */

/** `[[Título da nota]]` — sem colchete aninhado e sem quebra de linha. */
const WIKI_LINK = /\[\[([^[\]\n]+)\]\]/g

/** Junta todo o texto de um documento JSON, seja qual for o formato. */
export function collectText(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') {
    out.push(node)
    return out
  }

  if (Array.isArray(node)) {
    for (const child of node) collectText(child, out)
    return out
  }

  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      // Só o campo `text` carrega conteúdo; `type`, `attrs` e afins são estrutura.
      if (key === 'text' && typeof value === 'string') out.push(value)
      else if (typeof value === 'object') collectText(value, out)
    }
  }

  return out
}

/**
 * Títulos citados com `[[...]]`, sem repetição e sem ordem trocada.
 *
 * Citar a mesma nota duas vezes é um backlink só — a tabela `note_links` tem chave
 * composta, e duplicar quebraria a inserção.
 */
export function extractLinkedTitles(content: unknown): string[] {
  const text = collectText(content).join('\n')
  const seen = new Set<string>()
  const titles: string[] = []

  for (const match of text.matchAll(WIKI_LINK)) {
    const title = match[1]?.trim()

    if (!title) continue

    const key = normalizeTitle(title)

    if (seen.has(key)) continue

    seen.add(key)
    titles.push(title)
  }

  return titles
}

/**
 * Forma canônica de um título, para casar `[[casa]]` com a nota "Casa".
 *
 * Sem isto, cada variação de acento ou caixa criaria uma nota nova — que é exatamente
 * o tipo de lixo silencioso que a gente evitou no console.
 */
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}
