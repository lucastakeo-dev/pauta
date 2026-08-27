import { AuthForm } from '../features/auth/auth-form.js'

/**
 * Camada de apresentação: compõe a tela e não decide nada.
 * Toda a lógica de autenticar mora na feature.
 */
export function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-iris text-xs uppercase tracking-widest">Pauta</span>
          <p className="text-ink-subtle text-sm">
            Seu dia, suas tarefas e suas notas num lugar só.
          </p>
        </div>

        <AuthForm />
      </div>
    </main>
  )
}
