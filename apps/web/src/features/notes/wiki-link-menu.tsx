import { cn } from '../../shared/lib/cn.js'
import type { SuggestState } from './use-wiki-link-suggest.js'

const COPY = {
  rotulo: 'Notas sugeridas',
  criar: 'criar',
  vazio: 'Digite o nome da nota',
}

type WikiLinkMenuProps = {
  state: SuggestState
  onPick: (title: string) => void
}

/**
 * Menu de sugestões do `[[`.
 *
 * Fica preso ao cursor com posição fixa em vez de dentro do editor: um elemento no
 * fluxo do documento seria conteúdo editável, e o ProseMirror tentaria gerenciá-lo.
 */
export function WikiLinkMenu({ state, onPick }: WikiLinkMenuProps) {
  if (!state.open || !state.coords) return null

  const digitado = state.query.trim()
  const existeIgual = state.items.some(
    (item) => item.title.toLowerCase() === digitado.toLowerCase(),
  )

  return (
    <ul
      // O foco permanece no editor; o menu é anunciado como lista de opções.
      aria-label={COPY.rotulo}
      className={cn(
        'fixed z-40 max-h-56 w-64 overflow-y-auto rounded-control border border-line-strong',
        'bg-surface-overlay py-1 shadow-xl',
      )}
      style={{ top: state.coords.top + 4, left: state.coords.left }}
    >
      {state.items.length === 0 && !digitado ? (
        <li className="px-3 py-1.5 text-ink-subtle text-xs">{COPY.vazio}</li>
      ) : null}

      {state.items.map((item, index) => (
        <li key={item.id}>
          <button
            type="button"
            // `onMouseDown` e não `onClick`: o clique tiraria o foco do editor antes
            // de a seleção acontecer, e a posição de inserção se perderia.
            onMouseDown={(event) => {
              event.preventDefault()
              onPick(item.title)
            }}
            className={cn(
              'w-full truncate px-3 py-1.5 text-left text-sm transition-colors',
              index === state.activeIndex ? 'bg-iris/20 text-ink' : 'text-ink-muted',
            )}
          >
            {item.title}
          </button>
        </li>
      ))}

      {/* Escrever primeiro e preencher depois: o título novo vira nota no save. */}
      {digitado && !existeIgual ? (
        <li>
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault()
              onPick(digitado)
            }}
            className={cn(
              'w-full truncate px-3 py-1.5 text-left text-sm transition-colors',
              state.items.length === 0 ? 'bg-iris/20 text-ink' : 'text-ink-subtle',
            )}
          >
            {digitado} <span className="text-warning text-xs">· {COPY.criar}</span>
          </button>
        </li>
      ) : null}
    </ul>
  )
}
