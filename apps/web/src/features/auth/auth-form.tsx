import { loginSchema, registerSchema } from '@pauta/contracts'
import { type FormEvent, useState } from 'react'
import { ApiRequestError } from '../../shared/api/client.js'
import { Button } from '../../shared/ui/button.js'
import { Field } from '../../shared/ui/field.js'
import { useSession } from './session-context.js'

/** Copy fora do JSX: a tela fica legível e o texto, fácil de revisar. */
const COPY = {
  entrar: {
    titulo: 'Entrar',
    acao: 'Entrar',
    alternativa: 'Ainda não tem conta? Criar uma',
  },
  criar: {
    titulo: 'Criar conta',
    acao: 'Criar conta',
    alternativa: 'Já tem conta? Entrar',
  },
} as const

type Mode = keyof typeof COPY

export function AuthForm() {
  const { signIn, signUp } = useSession()
  const [mode, setMode] = useState<Mode>('entrar')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const copy = COPY[mode]

  function switchMode() {
    setMode((current) => (current === 'entrar' ? 'criar' : 'entrar'))
    setFieldErrors({})
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)

    const data = Object.fromEntries(new FormData(event.currentTarget))

    // Valida no cliente com o MESMO schema da API: o erro aparece antes da viagem
    // de rede, mas quem garante continua sendo o servidor.
    const schema = mode === 'entrar' ? loginSchema : registerSchema
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
      if (mode === 'entrar') {
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
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4" noValidate>
      <h1 className="font-semibold text-2xl text-ink">{copy.titulo}</h1>

      {mode === 'criar' ? (
        <Field label="Nome" name="name" autoComplete="name" required error={fieldErrors.name} />
      ) : null}

      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={fieldErrors.email}
      />

      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
        required
        error={fieldErrors.password}
        hint={mode === 'criar' ? 'Pelo menos 8 caracteres.' : undefined}
      />

      {formError ? (
        <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-danger text-sm">
          {formError}
        </p>
      ) : null}

      <Button type="submit" loading={submitting} className="mt-2">
        {copy.acao}
      </Button>

      <Button type="button" variant="ghost" onClick={switchMode}>
        {copy.alternativa}
      </Button>
    </form>
  )
}
