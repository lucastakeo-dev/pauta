import type { CreateLabelInput, LabelView } from '@pauta/contracts'
import { apiRequest } from '../../shared/api/client.js'

export function listLabels(): Promise<LabelView[]> {
  return apiRequest<LabelView[]>('/labels')
}

export function createLabel(input: CreateLabelInput): Promise<LabelView> {
  return apiRequest<LabelView>('/labels', { method: 'POST', body: input })
}

export function deleteLabel(id: string): Promise<void> {
  return apiRequest<void>(`/labels/${id}`, { method: 'DELETE' })
}
