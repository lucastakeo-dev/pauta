import { Link } from '@tanstack/react-router'
import { AuthForm } from '../features/auth/auth-form.js'

const COPY = {
  marca: 'Pauta',
  voltar: 'Voltar',
  eyebrow: 'Ferramenta pessoal, código aberto',
  frase: 'Tarefas, agenda e notas no mesmo lugar, feitos para o teclado.',
}

/** Os mesmos números da vitrine — amarram as duas telas sem repetir o discurso. */
const NUMEROS = [
  { valor: '293', rotulo: 'testes' },
  { valor: '8', rotulo: 'suítes no navegador' },
  { valor: '4', rotulo: 'módulos' },
] as const

/**
 * Entrada do app, no tema claro da vitrine.
 *
 * Quem chega aqui vem da landing: manter o escuro do app faria a transição parecer
 * outro produto. A troca de tema acontece só ao entrar de fato, quando a superfície
 * deixa de ser vitrine e passa a ser ferramenta.
 */
export function LoginPage() {
  return (
    <div className="landing flex min-h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between px-6 py-6 sm:px-10">
        <Link to="/" className="flex items-baseline gap-1.5">
          <span className="font-display font-medium text-graphite text-lg tracking-tight">
            {COPY.marca}
          </span>
          <span className="font-mono text-[10px] text-graphite-faint">™</span>
        </Link>

        <Link
          to="/"
          className="flex items-center gap-2 text-graphite-soft text-sm transition-colors hover:text-graphite"
        >
          <span aria-hidden="true">←</span>
          {COPY.voltar}
        </Link>
      </header>

      <main className="grid flex-1 lg:grid-cols-2">
        <div className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-sm">
            <AuthForm />
          </div>
        </div>

        {/*
          A grade só na coluna de apoio: ela dá a assinatura da vitrine sem competir
          com o formulário, que precisa de fundo limpo para ser lido. Some no mobile,
          onde não haveria espaço para ela existir sem atrapalhar.
        */}
        <aside className="landing-grid hidden flex-col justify-end border-rule border-l px-10 py-14 lg:flex">
          <p className="landing-eyebrow">{COPY.eyebrow}</p>

          <p className="mt-6 max-w-sm text-graphite-soft text-lg leading-relaxed">{COPY.frase}</p>

          <dl className="mt-12 flex gap-10 border-rule border-t pt-8">
            {NUMEROS.map((numero) => (
              <div key={numero.rotulo} className="flex flex-col gap-1">
                <dt className="landing-display text-3xl">{numero.valor}</dt>
                <dd className="font-mono text-[10px] text-graphite-soft uppercase tracking-wide">
                  {numero.rotulo}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </main>
    </div>
  )
}
