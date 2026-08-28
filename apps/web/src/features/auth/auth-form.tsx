import { loginSchema, registerSchema } from '@pauta/contracts'
import { Link } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import { ApiRequestError } from '../../shared/api/client.js'
import { cn } from '../../shared/lib/cn.js'
import { AuthField } from './auth-field.js'
import { useSession } from './session-context.js'

/** Copy fora do JSX: a tela fica legível e o texto, fácil de revisar. */
const COPY = {
  signin: {
    titulo1: 'Bom te ver',
    titulo2: 'de novo.',
    acao: 'Entrar',
    pergunta: 'Ainda não tem conta?',
    alternativa: 'Criar uma',
    outraRota: '/signup',
  },
  signup: {
    titulo1: 'Comece a',
    titulo2: 'organizar o dia.',
    acao: 'Criar conta',
    pergunta: 'Já tem conta?',
    alternativa: 'Entrar',
    outraRota: '/signin',
  },
} as const

export type AuthMode = keyof typeof COPY

/**
 * Formulário de entrada e de cadastro.
 *
 * O modo vem da rota, não de estado interno: assim cada um tem URL própria, dá para
 * mandar alguém direto para o cadastro, e o botão "voltar" do navegador faz o que se
 * espera. A alternância entre os dois é um `<Link>`, não um `setState`.
 */
export function AuthForm({ mode }: { mode: AuthMode }) {
  const { signIn, signUp } = useSession()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const copy = COPY[mode]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)

    const data = Object.fromEntries(new FormData(event.currentTarget))

    // Valida no cliente com o MESMO schema da API: o erro aparece antes da viagem
    // de rede, mas quem garante continua sendo o servidor.
    const schema = mode === 'signin' ? loginSchema : registerSchema
    const parsed = schema.safeParse(data)

    if (!parsed.success) {
      const errors: Record<string, string> = {}

      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? 'form')
        errors[field] ??= issue.message
      }

      setFieldErrors(errors)
      return
    }

    setSubmitting(true)

    try {
      if (mode === 'signin') {
        await signIn(parsed.data as never)
      } else {
        await signUp(parsed.data as never)
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        // Erro de campo volta para o campo; o resto vira mensagem do formulário.
        if (error.details) {
          const errors: Record<string, string> = {}
          for (const [field, messages] of Object.entries(error.details)) {
            if (messages[0]) errors[field] = messages[0]
          }
          setFieldErrors(errors)
        } else {
          setFormError(error.message)
        }
      } else {
        setFormError('Algo deu errado. Tente novamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-10">
      <h1 className="landing-display text-[clamp(2.25rem,5vw,3.25rem)]">
        {copy.titulo1}
        <br />
        <span className="text-graphite-faint">{copy.titulo2}</span>
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {mode === 'signup' ? (
          <AuthField
            label="Nome"
            name="name"
            autoComplete="name"
            required
            error={fieldErrors.name}
          />
        ) : null}

        <AuthField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={fieldErrors.email}
        />

        <AuthField
          label="Senha"
          name="password"
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
          error={fieldErrors.password}
          hint={mode === 'signup' ? 'Pelo menos 8 caracteres.' : undefined}
        />

        {formError ? (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-danger text-sm">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className={cn(
            'mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full',
            'bg-graphite font-medium text-[15px] text-paper',
            'transition-opacity hover:opacity-85',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {submitting ? (
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          ) : null}
          {copy.acao}
          {submitting ? null : <span aria-hidden="true">→</span>}
        </button>
      </form>

      <p className="text-graphite-soft text-sm">
        {copy.pergunta}{' '}
        <Link
          to={copy.outraRota}
          className="font-medium text-graphite underline underline-offset-4 transition-opacity hover:opacity-70"
        >
          {copy.alternativa}
        </Link>
      </p>
    </div>
  )
}
