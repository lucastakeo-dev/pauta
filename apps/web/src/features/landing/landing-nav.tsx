import { Link } from '@tanstack/react-router'

const COPY = {
  marca: 'Pauta',
  entrar: 'Entrar',
  codigo: 'Ver o código',
}

const SECOES = [
  { href: '#modulos', label: 'Módulos' },
  { href: '#arquitetura', label: 'Arquitetura' },
  { href: '#parser', label: 'Parser' },
  { href: '#stack', label: 'Stack' },
] as const

export const REPO_URL = 'https://github.com/lucastakeo-dev/pauta'

/**
 * Barra flutuante da vitrine.
 *
 * `sticky` e não `fixed`: ela precisa participar do fluxo para o conteúdo não passar
 * por baixo no topo da página, e ainda assim acompanhar a rolagem.
 */
export function LandingNav() {
  return (
    <div className="sticky top-0 z-40 px-4 pt-4">
      <nav
        aria-label="Navegação da página"
        className="mx-auto flex max-w-6xl items-center gap-8 rounded-full border border-rule bg-paper/85 px-6 py-3 backdrop-blur-md"
      >
        <a href="#topo" className="flex items-baseline gap-1.5">
          <span className="font-display font-medium text-graphite text-lg tracking-tight">
            {COPY.marca}
          </span>
          <span className="font-mono text-[10px] text-graphite-faint">™</span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {SECOES.map((secao) => (
            <a
              key={secao.href}
              href={secao.href}
              className="text-graphite-soft text-sm transition-colors hover:text-graphite"
            >
              {secao.label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden text-graphite-soft text-sm transition-colors hover:text-graphite sm:block"
          >
            {COPY.codigo}
          </a>

          <Link
            to="/signin"
            className="rounded-full bg-graphite px-5 py-2 font-medium text-paper text-sm transition-opacity hover:opacity-85"
          >
            {COPY.entrar}
          </Link>
        </div>
      </nav>
    </div>
  )
}
