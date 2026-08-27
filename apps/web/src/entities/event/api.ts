import type { CreateEventInput, EventView, UpdateEventInput } from '@pauta/contracts'
import { apiRequest } from '../../shared/api/client.js'

export function listEvents(from: string, to: string): Promise<EventView[]> {
  const params = new URLSearchParams({ from, to })
  return apiRequest<EventView[]>(`/events?${params.toString()}`)
}

export function createEvent(input: CreateEventInput): Promise<EventView> {
  return apiRequest<EventView>('/events', { method: 'POST', body: input })
}

export function updateEvent(id: string, input: UpdateEventInput): Promise<EventView> {
  return apiRequest<EventView>(`/events/${id}`, { method: 'PATCH', body: input })
}

export function deleteEvent(id: string): Promise<void> {
  return apiRequest<void>(`/events/${id}`, { method: 'DELETE' })
}
