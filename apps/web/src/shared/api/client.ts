import { apiErrorSchema } from '@pauta/contracts'
import { env } from '../config/env.js'
import { clearToken, readToken } from './token-storage.js'

/**
 * Client HTTP único do app.
 *
 * A API responde erro sempre no mesmo shape (`ApiError`), então o tratamento vive aqui
 * e as features só precisam capturar `ApiRequestError` — nenhuma tela repete
 * `if (!response.ok)`.
 */
export class ApiRequestError extends Error {
  readonly code: string
  readonly status: number
  readonly details: Record<string, string[]> | undefined

  constructor(code: string, message: string, status: number, details?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = code
    this.status = status
    this.details = details
  }

  /** Mensagem do primeiro campo inválido — o que o formulário quer mostrar. */
  fieldError(field: string): string | undefined {
    return this.details?.[field]?.[0]
  }
}

/**
 * O que o servidor explicou, quando explicou.
 *
 * Vai na segunda linha do aviso, embaixo do título nosso. Antes a mensagem da API
 * *substituía* a nossa, e a pessoa lia "Já existe um projeto com esse nome." sem saber
 * qual ação tinha falhado. As duas juntas dizem o que quebrou e por quê.
 */
export function apiErrorDetail(cause: unknown): string | undefined {
  return cause instanceof ApiRequestError ? cause.message : undefined
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

/** Disparado quando o token deixa de valer, para o app voltar ao login. */
export const UNAUTHORIZED_EVENT = 'pauta:unauthorized'

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options
  const token = readToken()

  let response: Response

  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      method,
      signal,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch (cause) {
    // Rede fora, API caída ou CORS: nenhum desses tem `code` da API.
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause
    }

    throw new ApiRequestError(
      'network_error',
      'Não foi possível falar com o servidor. Verifique sua conexão.',
      0,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    // Token expirado ou inválido: limpa e avisa o app, que redireciona ao login.
    if (response.status === 401) {
      clearToken()
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
    }

    const parsed = apiErrorSchema.safeParse(payload)

    if (parsed.success) {
      throw new ApiRequestError(
        parsed.data.code,
        parsed.data.message,
        response.status,
        parsed.data.details,
      )
    }

    throw new ApiRequestError(
      'unexpected_error',
      'Algo deu errado. Tente novamente.',
      response.status,
    )
  }

  return payload as T
}
