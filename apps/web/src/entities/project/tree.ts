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
