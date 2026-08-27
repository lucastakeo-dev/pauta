import type { EventView } from '@pauta/contracts'
import type { EventRecord } from '../models/event.model.js'

/**
 * View do evento. Mapeamento campo a campo, como nas demais: `externalId` existe na
 * tabela mas **não sai na API** — é detalhe do sync futuro, não do cliente.
 */
export function renderEvent(event: EventRecord): EventView {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    allDay: event.allDay,
    location: event.location,
    source: event.source,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }
}

export function renderEvents(events: EventRecord[]): EventView[] {
  return events.map(renderEvent)
}
