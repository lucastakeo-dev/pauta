import { describe, expect, it } from 'vitest'
import { selectionAfterChange } from './use-inbox-selection.js'

describe('selectionAfterChange', () => {
  it('mantém o item escolhido enquanto ele estiver na fila', () => {
    expect(selectionAfterChange(['a', 'b', 'c'], 'b', 1)).toBe('b')
  })

  it('seleciona o primeiro quando ainda não houve escolha', () => {
    expect(selectionAfterChange(['a', 'b'], null, 0)).toBe('a')
  })

  it('assume a posição do item que saiu da fila', () => {
    expect(selectionAfterChange(['a', 'c', 'd'], 'b', 1)).toBe('c')
  })

  it('recua para o último quando o item que saiu era o final', () => {
    expect(selectionAfterChange(['a', 'b'], 'c', 2)).toBe('b')
  })

  it('devolve nulo com a fila vazia', () => {
    expect(selectionAfterChange([], 'a', 0)).toBeNull()
  })
})
