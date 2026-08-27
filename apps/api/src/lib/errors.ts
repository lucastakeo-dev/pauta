/**
 * Erros de domínio. O model lança, o handler central traduz para HTTP.
 * Nada aqui conhece Fastify — é o que permite testar regra de negócio sem servidor.
 *
 * `code` é estável e serve de contrato para o front reagir de forma específica;
 * `message` é a frase em pt-BR que a pessoa lê.
 */
export class DomainError extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly details?: Record<string, string[]>

  constructor(
    code: string,
    message: string,
    httpStatus: number,
    details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = new.target.name
    this.code = code
    this.httpStatus = httpStatus
    this.details = details
  }
}

/** Recurso não existe, ou existe mas é de outra pessoa — a resposta é a mesma
 *  de propósito, para não revelar a existência de dados alheios. */
export class NotFoundError extends DomainError {
  constructor(resource: string) {
    super('not_found', `${resource} não encontrado.`, 404)
  }
}

/** Violação de unicidade ou de estado: algo já existe ou conflita com o que existe. */
export class ConflictError extends DomainError {
  constructor(code: string, message: string) {
    super(code, message, 409)
  }
}

/** Credencial ausente, inválida ou expirada. */
export class UnauthorizedError extends DomainError {
  constructor(message = 'Sessão inválida ou expirada. Entre novamente.') {
    super('unauthorized', message, 401)
  }
}

/** Entrada válida no formato, mas inválida como regra de negócio. */
export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, string[]>) {
    super('validation_error', message, 422, details)
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError
}
