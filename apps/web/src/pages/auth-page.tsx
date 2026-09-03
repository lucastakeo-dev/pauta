import { Link } from '@tanstack/react-router'
import { AuthForm, type AuthMode } from '../features/auth/auth-form.js'

const COPY = {
  marca: 'Pauta',
  voltar: 'Voltar',
  eyebrow: 'Agenda, tarefas e notas — num app só',
  frase:
    'Capture em segundos, arraste para a hora e veja o dia se montar — sem trocar de aba ' +
    'e sem tirar as mãos do teclado.',
}

/**
 * Os mesmos pilares da vitrine, em uma linha cada.
 *
 * Antes havia números do projeto aqui — testes, suítes, módulos. Numa tela de entrar,
 * eles respondiam a pergunta errada: quem chegou até o formulário já decidiu entrar, e
 * o que ajuda é lembrar o que vai encontrar do outro lado.
 */
const PILARES = [
  'Planner do dia com compromissos e tarefas juntos',
  'Tarefas com projetos, etiquetas e subtarefas',
  'Captura rápida em português, com ⌘K',
  'Notas do dia e páginas ligadas por [[link]]',
] as const

/**
 * Entrada do app — serve `/signin` e `/signup`, no tema claro da vitrine.
 *
 * Quem chega aqui vem da landing: manter o escuro do app faria a transição parecer
 * outro produto. A troca de tema acontece só ao entrar de fato, quando a superfície
 * deixa de ser vitrine e passa a ser ferramenta.
 *
 * O modo é prop, não estado: quem decide é a rota.
 */
export function AuthPage({ mode }: { mode: AuthMode }) {
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
            <AuthForm mode={mode} />
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

          <ul className="mt-12 flex flex-col gap-3 border-rule border-t pt-8">
            {PILARES.map((pilar) => (
              <li key={pilar} className="flex items-start gap-3 text-graphite-soft text-sm">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1 shrink-0 rounded-full bg-graphite-faint"
                />
                {pilar}
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  )
}
