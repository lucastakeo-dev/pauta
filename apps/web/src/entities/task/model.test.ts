import type { TaskView } from '@pauta/contracts'
import { describe, expect, it } from 'vitest'
import { dueLabel, groupByDue, isOverdue, parsePriority } from './model.js'

/** Data fixa: sem isso os testes de "hoje/amanhã" quebrariam sozinhos amanhã. */
const HOJE = new Date('2026-09-15T10:00:00.000Z')

function task(overrides: Partial<TaskView> = {}): TaskView {
  return {
    id: 'id',
    title: 'Tarefa',
    notes: null,
    status: 'todo',
    priority: 4,
    dueAt: null,
    scheduledStart: null,
    scheduledEnd: null,
    estimateMin: null,
    completedAt: null,
    projectId: null,
    project: null,
    parentId: null,
    labels: [],
    subtaskCount: 0,
    completedSubtaskCount: 0,
    recurrence: null,
    occurrenceOn: null,
    isVirtual: false,
    position: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('parsePriority', () => {
  it('separa o sufixo do título', () => {
    expect(parsePriority('Pagar boleto p1')).toEqual({ title: 'Pagar boleto', priority: 1 })
  })

  it('aceita maiúscula', () => {
    expect(parsePriority('Ligar P2')).toEqual({ title: 'Ligar', priority: 2 })
  })

  it('usa P4 quando não há sufixo', () => {
    expect(parsePriority('Comprar café')).toEqual({ title: 'Comprar café', priority: 4 })
  })

  it('ignora número fora da faixa', () => {
    // "p9" não é prioridade: continua fazendo parte do título.
    expect(parsePriority('Rodar p9')).toEqual({ title: 'Rodar p9', priority: 4 })
  })

  it('não confunde "p1" no meio do texto', () => {
    expect(parsePriority('Revisar p1 do contrato')).toEqual({
      title: 'Revisar p1 do contrato',
      priority: 4,
    })
  })
})

describe('dueLabel', () => {
  const casos: Array<[string, string]> = [
    ['2026-09-15T18:00:00.000Z', 'Hoje'],
    ['2026-09-16T09:00:00.000Z', 'Amanhã'],
    ['2026-09-14T09:00:00.000Z', 'Ontem'],
    ['2026-09-10T09:00:00.000Z', 'Atrasada 5 dias'],
  ]

  for (const [iso, esperado] of casos) {
    it(`descreve ${iso} como "${esperado}"`, () => {
      expect(dueLabel(iso, HOJE)).toBe(esperado)
    })
  }

  it('usa o dia da semana para a próxima semana', () => {
    // 18/09/2026 é uma sexta.
    expect(dueLabel('2026-09-18T09:00:00.000Z', HOJE)).toContain('sexta')
  })

  it('cai na data curta quando o prazo está longe', () => {
    expect(dueLabel('2026-11-20T09:00:00.000Z', HOJE)).toMatch(/\d{2}/)
  })
})

describe('isOverdue', () => {
  it('marca atraso só enquanto a tarefa está aberta', () => {
    const atrasada = task({ dueAt: '2026-09-10T09:00:00.000Z' })

    expect(isOverdue(atrasada, HOJE)).toBe(true)
    expect(isOverdue({ ...atrasada, status: 'done' }, HOJE)).toBe(false)
  })

  it('tarefa sem prazo nunca atrasa', () => {
    expect(isOverdue(task(), HOJE)).toBe(false)
  })
})

describe('groupByDue', () => {
  it('separa nos grupos de decisão e omite os vazios', () => {
    const grupos = groupByDue(
      [
        task({ id: '1', dueAt: '2026-09-10T09:00:00.000Z' }),
        task({ id: '2', dueAt: '2026-09-15T09:00:00.000Z' }),
        task({ id: '3' }),
      ],
      HOJE,
    )

    expect(grupos.map((g) => g.key)).toEqual(['overdue', 'today', 'someday'])
    expect(grupos.map((g) => g.tasks.length)).toEqual([1, 1, 1])
  })

  it('tarefa concluída com prazo vencido não conta como atrasada', () => {
    const grupos = groupByDue([task({ dueAt: '2026-09-10T09:00:00.000Z', status: 'done' })], HOJE)

    expect(grupos.map((g) => g.key)).not.toContain('overdue')
  })
})
