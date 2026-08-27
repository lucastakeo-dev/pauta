import type { EventView, TaskView } from '@pauta/contracts'
import { describe, expect, it } from 'vitest'
import {
  addDays,
  blockGeometry,
  dayBounds,
  dayLabel,
  durationInMinutes,
  fitBlockInDay,
  isSameDay,
  MIN_BLOCK_MINUTES,
  MIN_DURATION_MINUTES,
  minutesFromDayStart,
  nowOffset,
  resizeEnd,
  snapMinutes,
  timeFromOffset,
  toPlannerItems,
} from './model.js'

const HOUR = 56

/**
 * As contas são no fuso local, então os testes montam as datas com componentes locais
 * em vez de string ISO com Z — assim eles valem em qualquer máquina.
 */
function at(day: number, hour: number, minute = 0): Date {
  return new Date(2026, 8, day, hour, minute, 0, 0)
}

const DIA = at(15, 0)

function task(overrides: Partial<TaskView> = {}): TaskView {
  return {
    id: 't1',
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

function event(overrides: Partial<EventView> = {}): EventView {
  return {
    id: 'e1',
    title: 'Evento',
    description: null,
    startsAt: at(15, 9).toISOString(),
    endsAt: at(15, 10).toISOString(),
    allDay: false,
    location: null,
    source: 'internal',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('dayBounds', () => {
  it('vai da meia-noite local à meia-noite seguinte', () => {
    const { start, end } = dayBounds(at(15, 14, 30))

    expect(start.getHours()).toBe(0)
    expect(start.getDate()).toBe(15)
    expect(end.getDate()).toBe(16)
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000)
  })
})

describe('minutesFromDayStart', () => {
  it('conta a partir da meia-noite', () => {
    expect(minutesFromDayStart(at(15, 9, 30), at(15, 0))).toBe(570)
  })
})

describe('blockGeometry', () => {
  it('posiciona pelo horário de início', () => {
    const { top, height } = blockGeometry({ startsAt: at(15, 9), endsAt: at(15, 10) }, DIA, HOUR)

    expect(top).toBe(9 * HOUR)
    expect(height).toBe(HOUR)
  })

  it('respeita a meia hora', () => {
    const { top } = blockGeometry({ startsAt: at(15, 9, 30), endsAt: at(15, 10) }, DIA, HOUR)

    expect(top).toBe(9.5 * HOUR)
  })

  it('dá altura mínima a um bloco muito curto', () => {
    // Cinco minutos viraria um risco de 4px sem o piso.
    const { height } = blockGeometry({ startsAt: at(15, 9), endsAt: at(15, 9, 5) }, DIA, HOUR)

    expect(height).toBe((MIN_BLOCK_MINUTES / 60) * HOUR)
  })

  it('recorta no topo o que começou no dia anterior', () => {
    const { top, height } = blockGeometry({ startsAt: at(14, 20), endsAt: at(15, 4) }, DIA, HOUR)

    expect(top).toBe(0)
    expect(height).toBe(4 * HOUR)
  })

  it('recorta embaixo o que avança para o dia seguinte', () => {
    const { top, height } = blockGeometry({ startsAt: at(15, 22), endsAt: at(16, 3) }, DIA, HOUR)

    expect(top).toBe(22 * HOUR)
    expect(height).toBe(2 * HOUR)
  })

  it('recorta dos dois lados o que atravessa o dia inteiro', () => {
    const { top, height } = blockGeometry({ startsAt: at(10, 0), endsAt: at(20, 0) }, DIA, HOUR)

    expect(top).toBe(0)
    expect(height).toBe(24 * HOUR)
  })
})

describe('toPlannerItems', () => {
  it('ignora tarefa sem bloco de tempo', () => {
    const items = toPlannerItems([task()], [], DIA)
    expect(items).toEqual([])
  })

  it('inclui tarefa agendada', () => {
    const items = toPlannerItems(
      [
        task({
          scheduledStart: at(15, 9).toISOString(),
          scheduledEnd: at(15, 10).toISOString(),
        }),
      ],
      [],
      DIA,
    )

    expect(items).toHaveLength(1)
    expect(items[0]?.kind).toBe('task')
  })

  it('ignora o que é de outro dia', () => {
    const items = toPlannerItems(
      [
        task({
          scheduledStart: at(20, 9).toISOString(),
          scheduledEnd: at(20, 10).toISOString(),
        }),
      ],
      [event({ startsAt: at(20, 9).toISOString(), endsAt: at(20, 10).toISOString() })],
      DIA,
    )

    expect(items).toEqual([])
  })

  it('ordena tarefas e eventos juntos por horário', () => {
    const items = toPlannerItems(
      [
        task({
          id: 'tarde',
          scheduledStart: at(15, 15).toISOString(),
          scheduledEnd: at(15, 16).toISOString(),
        }),
      ],
      [event({ id: 'manha', startsAt: at(15, 8).toISOString(), endsAt: at(15, 9).toISOString() })],
      DIA,
    )

    expect(items.map((i) => i.id)).toEqual(['manha', 'tarde'])
  })

  it('marca o que vem do dia anterior e o que segue para o próximo', () => {
    const items = toPlannerItems(
      [],
      [event({ startsAt: at(14, 20).toISOString(), endsAt: at(16, 3).toISOString() })],
      DIA,
    )

    expect(items[0]).toMatchObject({
      continuesFromPreviousDay: true,
      continuesToNextDay: true,
    })
  })

  it('leva a cor do projeto para o bloco', () => {
    const items = toPlannerItems(
      [
        task({
          scheduledStart: at(15, 9).toISOString(),
          scheduledEnd: at(15, 10).toISOString(),
          project: { id: 'p', name: 'Casa', color: '#FF0000' },
        }),
      ],
      [],
      DIA,
    )

    expect(items[0]?.color).toBe('#FF0000')
  })
})

describe('nowOffset', () => {
  it('posiciona o marcador na hora atual', () => {
    expect(nowOffset(DIA, HOUR, at(15, 12))).toBe(12 * HOUR)
  })

  it('devolve null quando o dia mostrado não é hoje', () => {
    // Marcar "agora" num dia que não é hoje seria mentira visual.
    expect(nowOffset(DIA, HOUR, at(16, 12))).toBeNull()
  })
})

describe('dayLabel', () => {
  it('usa palavra em vez de data para os dias vizinhos', () => {
    const hoje = at(15, 10)

    expect(dayLabel(hoje, hoje)).toBe('Hoje')
    expect(dayLabel(addDays(hoje, 1), hoje)).toBe('Amanhã')
    expect(dayLabel(addDays(hoje, -1), hoje)).toBe('Ontem')
  })

  it('usa a data por extenso para os demais', () => {
    expect(dayLabel(at(20, 10), at(15, 10))).toMatch(/20/)
  })
})

describe('isSameDay', () => {
  it('compara o dia, não o instante', () => {
    expect(isSameDay(at(15, 0), at(15, 23, 59))).toBe(true)
    expect(isSameDay(at(15, 23, 59), at(16, 0))).toBe(false)
  })
})

describe('snapMinutes', () => {
  it('arredonda para o encaixe mais próximo', () => {
    expect(snapMinutes(0)).toBe(0)
    expect(snapMinutes(7)).toBe(0)
    expect(snapMinutes(8)).toBe(15)
    expect(snapMinutes(22)).toBe(15)
    expect(snapMinutes(23)).toBe(30)
    expect(snapMinutes(60)).toBe(60)
  })
})

describe('timeFromOffset', () => {
  it('converte posição em horário encaixado', () => {
    // 9h em pixels, mais um pouco: encaixa nos 15 minutos mais próximos.
    const t = timeFromOffset(9 * HOUR + 10, DIA, HOUR)

    expect(t.getHours()).toBe(9)
    expect(t.getMinutes()).toBe(15)
  })

  it('não deixa passar do topo do dia', () => {
    // Soltar acima da grade vira meia-noite, não o dia anterior.
    const t = timeFromOffset(-500, DIA, HOUR)

    expect(t.getHours()).toBe(0)
    expect(t.getDate()).toBe(15)
  })

  it('não deixa passar do fim do dia', () => {
    const t = timeFromOffset(999 * HOUR, DIA, HOUR)

    expect(t.getTime()).toBe(dayBounds(DIA).end.getTime())
  })
})

describe('fitBlockInDay', () => {
  it('mantém a duração pedida', () => {
    const { start, end } = fitBlockInDay(at(15, 9), 90, DIA)

    expect(durationInMinutes(start, end)).toBe(90)
    expect(start.getHours()).toBe(9)
  })

  it('recua o bloco que vazaria para o dia seguinte', () => {
    // Uma hora solta às 23h30 termina à meia-noite, começando às 23h.
    const { start, end } = fitBlockInDay(at(15, 23, 30), 60, DIA)

    expect(start.getHours()).toBe(23)
    expect(start.getMinutes()).toBe(0)
    expect(end.getTime()).toBe(dayBounds(DIA).end.getTime())
  })

  it('aplica o piso de duração', () => {
    const { start, end } = fitBlockInDay(at(15, 9), 1, DIA)

    expect(durationInMinutes(start, end)).toBe(MIN_DURATION_MINUTES)
  })

  it('não deixa começar antes da meia-noite', () => {
    const { start } = fitBlockInDay(at(14, 23), 60, DIA)

    expect(start.getTime()).toBe(dayBounds(DIA).start.getTime())
  })
})

describe('resizeEnd', () => {
  it('estica até a posição solta', () => {
    const fim = resizeEnd(at(15, 9), 11 * HOUR, DIA, HOUR)

    expect(fim.getHours()).toBe(11)
  })

  it('respeita a duração mínima ao encolher demais', () => {
    // Arrastar a borda para cima do início não pode inverter o bloco.
    const fim = resizeEnd(at(15, 9), 8 * HOUR, DIA, HOUR)

    expect(durationInMinutes(at(15, 9), fim)).toBe(MIN_DURATION_MINUTES)
  })

  it('não passa da meia-noite', () => {
    const fim = resizeEnd(at(15, 23), 999 * HOUR, DIA, HOUR)

    expect(fim.getTime()).toBe(dayBounds(DIA).end.getTime())
  })
})
