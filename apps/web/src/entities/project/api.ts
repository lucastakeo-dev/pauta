import type {
  CreateProjectInput,
  MoveProjectInput,
  ProjectView,
  UpdateProjectInput,
} from '@pauta/contracts'
import { apiRequest } from '../../shared/api/client.js'

export function listProjects(includeArchived = false): Promise<ProjectView[]> {
  return apiRequest<ProjectView[]>(`/projects?includeArchived=${includeArchived}`)
}

export function createProject(input: CreateProjectInput): Promise<ProjectView> {
  return apiRequest<ProjectView>('/projects', { method: 'POST', body: input })
}

export function updateProject(id: string, input: UpdateProjectInput): Promise<ProjectView> {
  return apiRequest<ProjectView>(`/projects/${id}`, { method: 'PATCH', body: input })
}

export function deleteProject(id: string): Promise<void> {
  return apiRequest<void>(`/projects/${id}`, { method: 'DELETE' })
}

export function moveProject(id: string, input: MoveProjectInput): Promise<ProjectView> {
  return apiRequest<ProjectView>(`/projects/${id}/move`, { method: 'POST', body: input })
}
