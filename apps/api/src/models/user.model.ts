import type { RegisterInput } from '@pauta/contracts'
import argon2 from 'argon2'
import { prisma } from '../config/prisma.js'
import { ConflictError, UnauthorizedError } from '../lib/errors.js'

/**
 * Model do usuário: regra de negócio + persistência.
 *
 * O tipo abaixo é o contrato de saída do model. Nada do Prisma sai daqui — assim
 * uma coluna nova no banco nunca vaza sozinha para a resposta da API.
 */
export type UserRecord = {
  id: string
  name: string
  email: string
  timezone: string
  createdAt: Date
}

const publicFields = {
  id: true,
  name: true,
  email: true,
  timezone: true,
  createdAt: true,
} as const

/**
 * Cria a conta. A senha nunca é guardada em claro e o hash nunca sai do model.
 * Argon2id é o padrão recomendado atual para hash de senha.
 */
export async function register(input: RegisterInput): Promise<UserRecord> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  })

  if (existing) {
    throw new ConflictError('email_taken', 'Já existe uma conta com este e-mail.')
  }

  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id })

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      timezone: input.timezone,
    },
    select: publicFields,
  })
}

/**
 * Confere as credenciais.
 *
 * Quando o e-mail não existe, ainda assim gastamos tempo verificando um hash
 * descartável: sem isso, a diferença de tempo de resposta revelaria quais e-mails
 * têm conta.
 */
export async function authenticate(email: string, password: string): Promise<UserRecord> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { ...publicFields, passwordHash: true },
  })

  if (!user) {
    await argon2.verify(DUMMY_HASH, password).catch(() => false)
    throw new UnauthorizedError('E-mail ou senha incorretos.')
  }

  const valid = await argon2.verify(user.passwordHash, password)

  if (!valid) {
    throw new UnauthorizedError('E-mail ou senha incorretos.')
  }

  const { passwordHash: _passwordHash, ...record } = user

  return record
}

export async function findById(id: string): Promise<UserRecord | null> {
  return prisma.user.findUnique({ where: { id }, select: publicFields })
}

/** Hash fixo de uma senha aleatória, só para igualar o tempo de resposta acima. */
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHR2YWx1ZQ$FDaKQzKZTKZ0z6Lyqz1Jz9Z1lYQ3xJ3vN0lQnQmYQ0M'
