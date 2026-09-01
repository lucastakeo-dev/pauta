import type { ProjectView } from '@pauta/contracts'

export type ProjectNode = ProjectView & {
  children: ProjectNode[]
  /** Distância até a raiz. A árvore usa para recuar cada nível. */
  depth: number
  /** Tarefas em aberto deste projeto e de toda a subárvore abaixo dele. */
  totalOpenTaskCount: number
}

/**
 * Monta a árvore a partir da lista plana que a API devolve.
 *
 * Função pura em `entities` porque a barra lateral e a página de projetos precisam da
 * mesma árvore, e são features diferentes — se cada uma montasse a sua, as duas
 * discordariam no dia em que a regra mudar.
 *
 * Um projeto cujo pai não está na lista é tratado como raiz. Isso não é defensivo à toa:
 * arquivar o pai o tira da resposta padrão, e sem esta regra a subárvore inteira
 * desapareceria da tela sem nunca ter sido apagada.
 */
export function buildProjectTree(projects: ProjectView[]): ProjectNode[] {
  const presentes = new Set(projects.map((project) => project.id))
  const porPai = new Map<string | null, ProjectView[]>()

  for (const project of projects) {
    const pai = project.parentId && presentes.has(project.parentId) ? project.parentId : null
    const irmaos = porPai.get(pai)
    if (irmaos) irmaos.push(project)
    else porPai.set(pai, [project])
  }

  // `visitados` guarda contra um ciclo que tivesse escapado para o banco: sem ele, a
  // recursão não terminaria e a tela travaria em vez de mostrar dado errado.
  const visitados = new Set<string>()

  function montar(pai: string | null, depth: number): ProjectNode[] {
    return (porPai.get(pai) ?? [])
      .filter((project) => !visitados.has(project.id))
      .map((project) => {
        visitados.add(project.id)
        const children = montar(project.id, depth + 1)

        return {
          ...project,
          children,
          depth,
          totalOpenTaskCount:
            project.openTaskCount +
            children.reduce((soma, filho) => soma + filho.totalOpenTaskCount, 0),
        }
      })
  }

  return montar(null, 0)
}

/** Achata a árvore de volta, na ordem em que a tela desenha. */
/**
 * O projeto está nesta subárvore?
 *
 * A barra usa para marcar as pastas do caminho até o item selecionado. Sem isso, abrir
 * um subprojeto deixa a linha dele acesa e todas as pastas acima apagadas — a árvore
 * mostra onde se está sem mostrar como se chegou lá.
 */
export function containsProject(node: ProjectNode, id: string | undefined): boolean {
  if (!id) return false

  return node.children.some((filho) => filho.id === id || containsProject(filho, id))
}

export function flattenProjectTree(nodes: ProjectNode[]): ProjectNode[] {
  return nodes.flatMap((node) => [node, ...flattenProjectTree(node.children)])
}

/** Caminho da raiz até o projeto, para a trilha de navegação. */
export function projectPath(nodes: ProjectNode[], id: string): ProjectNode[] {
  for (const node of nodes) {
    if (node.id === id) return [node]

    const abaixo = projectPath(node.children, id)
    if (abaixo.length > 0) return [node, ...abaixo]
  }

  return []
}

/** Onde a soltura cai em relação à linha de destino. */
export type DropZone = 'before' | 'inside' | 'after'

/** O projeto, em qualquer nível da árvore. */
export function findProject(nodes: ProjectNode[], id: string): ProjectNode | null {
  for (const node of nodes) {
    if (node.id === id) return node

    const abaixo = findProject(node.children, id)
    if (abaixo) return abaixo
  }

  return null
}

/**
 * Para onde arrastar leva, traduzido no que a API espera.
 *
 * A conta que interessa é a da posição: o servidor insere o projeto numa lista de
 * irmãos que **não** o contém, então o índice do alvo tem de ser medido nessa mesma
 * lista. Medir na lista com o arrastado dentro erra por um sempre que ele já estava
 * acima do alvo — o clássico "soltei embaixo e ele foi parar em cima".
 *
 * Devolve `null` para soltura que não faz sentido: em cima de si mesmo, dentro da
 * própria subárvore (o servidor recusaria, e oferecer o gesto seria mentira) ou onde
 * nada mudaria de lugar.
 */
export function dropTarget(
  roots: ProjectNode[],
  draggedId: string,
  overId: string,
  zone: DropZone,
): { parentId: string | null; position?: number } | null {
  if (draggedId === overId) return null

  const dragged = findProject(roots, draggedId)
  const over = findProject(roots, overId)
  if (!dragged || !over) return null

  // Um projeto não entra na própria subárvore: isso desligaria os dois da raiz.
  if (containsProject(dragged, overId)) return null

  if (zone === 'inside') {
    // Já é filho direto e vai para o fim de um grupo onde ele já está no fim.
    const filhos = over.children
    if (filhos.at(-1)?.id === draggedId) return null

    return { parentId: overId }
  }

  const paiDoAlvo = parentIdOf(roots, overId)
  if (paiDoAlvo === undefined) return null

  const irmaos = (paiDoAlvo === null ? roots : (findProject(roots, paiDoAlvo)?.children ?? []))
    .filter((node) => node.id !== draggedId)
    .map((node) => node.id)

  const indice = irmaos.indexOf(overId)
  if (indice === -1) return null

  return { parentId: paiDoAlvo, position: zone === 'before' ? indice : indice + 1 }
}

/** O pai de um projeto: `null` na raiz, `undefined` quando ele não está na árvore. */
export function parentIdOf(
  nodes: ProjectNode[],
  id: string,
  pai: string | null = null,
): string | null | undefined {
  for (const node of nodes) {
    if (node.id === id) return pai

    const abaixo = parentIdOf(node.children, id, node.id)
    if (abaixo !== undefined) return abaixo
  }

  return undefined
}
