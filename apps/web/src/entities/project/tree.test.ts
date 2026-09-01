import type { ProjectView } from '@pauta/contracts'
import { describe, expect, it } from 'vitest'
import {
  buildProjectTree,
  containsProject,
  dropTarget,
  findProject,
  flattenProjectTree,
  parentIdOf,
  projectPath,
} from './tree.js'

function projeto(id: string, parentId: string | null = null, openTaskCount = 0): ProjectView {
  return {
    id,
    name: id,
    color: '#6E7BF2',
    icon: null,
    position: 0,
    archivedAt: null,
    openTaskCount,
    parentId,
    childCount: 0,
  }
}

describe('buildProjectTree', () => {
  it('devolve lista vazia sem projetos', () => {
    expect(buildProjectTree([])).toEqual([])
  })

  it('aninha filhos sob o pai', () => {
    const arvore = buildProjectTree([projeto('a'), projeto('b', 'a')])

    expect(arvore).toHaveLength(1)
    expect(arvore[0]?.children.map((n) => n.id)).toEqual(['b'])
  })

  it('marca a profundidade de cada nível', () => {
    const arvore = buildProjectTree([projeto('a'), projeto('b', 'a'), projeto('c', 'b')])

    expect(arvore[0]?.depth).toBe(0)
    expect(arvore[0]?.children[0]?.depth).toBe(1)
    expect(arvore[0]?.children[0]?.children[0]?.depth).toBe(2)
  })

  it('soma as tarefas da subárvore inteira', () => {
    const arvore = buildProjectTree([
      projeto('a', null, 1),
      projeto('b', 'a', 2),
      projeto('c', 'b', 4),
    ])

    expect(arvore[0]?.totalOpenTaskCount).toBe(7)
    expect(arvore[0]?.children[0]?.totalOpenTaskCount).toBe(6)
  })

  it('trata como raiz quem tem pai ausente da lista', () => {
    // Acontece de verdade: arquivar o pai o tira da resposta padrão. Sem esta regra a
    // subárvore sumiria da tela sem nunca ter sido apagada.
    const arvore = buildProjectTree([projeto('orfao', 'pai-arquivado')])

    expect(arvore.map((n) => n.id)).toEqual(['orfao'])
    expect(arvore[0]?.depth).toBe(0)
  })

  it('não entra em laço se um ciclo escapar para o banco', () => {
    // A API recusa criar isto, mas a tela não pode travar caso aconteça.
    const arvore = buildProjectTree([projeto('a', 'b'), projeto('b', 'a')])

    expect(flattenProjectTree(arvore).length).toBeLessThanOrEqual(2)
  })
})

describe('projectPath', () => {
  it('devolve o caminho da raiz até o projeto', () => {
    const arvore = buildProjectTree([projeto('a'), projeto('b', 'a'), projeto('c', 'b')])

    expect(projectPath(arvore, 'c').map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })

  it('devolve vazio para id desconhecido', () => {
    expect(projectPath(buildProjectTree([projeto('a')]), 'inexistente')).toEqual([])
  })
})

describe('flattenProjectTree', () => {
  it('achata na ordem em que a tela desenha', () => {
    const arvore = buildProjectTree([
      projeto('a'),
      projeto('a1', 'a'),
      projeto('a2', 'a'),
      projeto('b'),
    ])

    expect(flattenProjectTree(arvore).map((n) => n.id)).toEqual(['a', 'a1', 'a2', 'b'])
  })
})

describe('containsProject', () => {
  const arvore = buildProjectTree([
    projeto('trabalho'),
    projeto('plataforma', 'trabalho'),
    projeto('fase', 'plataforma'),
    projeto('casa'),
  ])

  const trabalho = arvore[0]
  if (!trabalho) throw new Error('árvore vazia')

  it('encontra um neto', () => {
    expect(containsProject(trabalho, 'fase')).toBe(true)
  })

  it('não conta o próprio nó', () => {
    // A barra usa isto para marcar as pastas *acima* do selecionado. Se o nó contasse
    // a si mesmo, o item aberto ganharia a barra de acento e o negrito do caminho.
    expect(containsProject(trabalho, 'trabalho')).toBe(false)
  })

  it('não atravessa para outro ramo', () => {
    expect(containsProject(trabalho, 'casa')).toBe(false)
  })

  it('sem seleção, ninguém está no caminho', () => {
    expect(containsProject(trabalho, undefined)).toBe(false)
  })
})

describe('findProject e parentIdOf', () => {
  const arvore = buildProjectTree([projeto('a'), projeto('b', 'a'), projeto('c', 'b')])

  it('acha em qualquer nível', () => {
    expect(findProject(arvore, 'c')?.id).toBe('c')
  })

  it('devolve nulo para quem não está na árvore', () => {
    expect(findProject(arvore, 'z')).toBeNull()
  })

  it('diz quem é o pai, e `null` na raiz', () => {
    expect(parentIdOf(arvore, 'c')).toBe('b')
    expect(parentIdOf(arvore, 'a')).toBeNull()
  })

  it('distingue "não tem pai" de "não existe"', () => {
    expect(parentIdOf(arvore, 'z')).toBeUndefined()
  })
})

describe('dropTarget', () => {
  // a, b, c na raiz; d dentro de a.
  const arvore = buildProjectTree([projeto('a'), projeto('b'), projeto('c'), projeto('d', 'a')])

  it('soltar dentro vira filho, no fim', () => {
    expect(dropTarget(arvore, 'c', 'a', 'inside')).toEqual({ parentId: 'a' })
  })

  it('soltar antes usa a posição do alvo', () => {
    expect(dropTarget(arvore, 'c', 'b', 'before')).toEqual({ parentId: null, position: 1 })
  })

  it('soltar depois usa a posição seguinte', () => {
    expect(dropTarget(arvore, 'a', 'b', 'after')).toEqual({ parentId: null, position: 1 })
  })

  /*
    O caso que o índice ingênuo erra: `a` está acima de `c`, então na lista sem ele o
    alvo anda uma casa para trás. Medir na lista com o arrastado dentro devolveria 3, e
    o projeto acabaria uma posição abaixo do que a pessoa mirou.
  */
  it('mede a posição na lista sem o próprio arrastado', () => {
    expect(dropTarget(arvore, 'a', 'c', 'after')).toEqual({ parentId: null, position: 2 })
  })

  it('leva para dentro de outro pai com a posição certa', () => {
    expect(dropTarget(arvore, 'b', 'd', 'before')).toEqual({ parentId: 'a', position: 0 })
  })

  it('recusa soltar em cima de si mesmo', () => {
    expect(dropTarget(arvore, 'a', 'a', 'inside')).toBeNull()
  })

  it('recusa entrar na própria subárvore', () => {
    expect(dropTarget(arvore, 'a', 'd', 'inside')).toBeNull()
    expect(dropTarget(arvore, 'a', 'd', 'before')).toBeNull()
  })

  it('recusa quando o gesto não mudaria nada', () => {
    // `d` já é o último filho de `a`.
    expect(dropTarget(arvore, 'd', 'a', 'inside')).toBeNull()
  })

  it('recusa alvo que não existe', () => {
    expect(dropTarget(arvore, 'a', 'z', 'after')).toBeNull()
  })
})
