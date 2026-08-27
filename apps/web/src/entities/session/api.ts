import type { LoginInput, RegisterInput, SessionView, UserView } from '@pauta/contracts'
import { apiRequest } from '../../shared/api/client.js'

/**
 * Acesso à API de sessão. Fica em `entities` porque é conhecimento do domínio
 * "quem está usando o app" — a camada `features` cuida da interação e do estado
 * de tela, e nenhuma delas monta URL na mão.
 */
export function login(input: LoginInput): Promise<SessionView> {
  return apiRequest<SessionView>('/auth/login', { method: 'POST', body: input })
}

export function register(input: RegisterInput): Promise<SessionView> {
  return apiRequest<SessionView>('/auth/register', { method: 'POST', body: input })
}

export function fetchCurrentUser(): Promise<UserView> {
  return apiRequest<UserView>('/auth/me')
}
