import { Link } from '@tanstack/react-router'
import { CircleDot, Inbox, Sparkles, WifiOff } from 'lucide-react'
import { toDateInputValue } from '../entities/planner/index.js'
import { type ConnectionState, useConnection } from '../features/agent/status.js'
import { useTasks } from '../features/tasks/queries.js'
import { cn } from '../shared/lib/cn.js'

const COPY = {
  barra: 'Estado do app',
  inbox: 'por processar',
  vencem: 'vencem hoje',
  agente: 'Agent',
  atalho: '⌘J',
  offline: 'Sem conexão',
  salvando: 'Salvando…',
  lendo: 'Carregando…',
  ok: 'Tudo salvo',
}

const ESTADOS: Record<ConnectionState, { texto: string; cor: string }> = {
  offline: { texto: COPY.offline, cor: 'text-danger' },
  salvando: { texto: COPY.salvando, cor: 'text-warning' },
  lendo: { texto: COPY.lendo, cor: 'text-ink-subtle' },
  ok: { texto: COPY.ok, cor: 'text-ink-subtle' },
}

/**
 * O rodapé fixo: o que espera, o que o app está fazendo, e o Agent.
 *
 * Ele existe porque duas informações não tinham casa. A primeira é a fila: o inbox só
 * aparece quando se abre o inbox, e o que ninguém vê ninguém processa. A segunda é o
 * estado da escrita — todo o app aplica antes de confirmar, e até aqui "aplicado" e
 * "salvo" eram a mesma imagem na tela.
 *
 * A altura é de uma linha e o peso é o menor do app: é rodapé, não painel.
 */
export function StatusBar({
  agenteAberto,
  onAgente,
}: {
  agenteAberto: boolean
  onAgente: () => void
}) {
  const conexao = useConnection()
  const estado = ESTADOS[conexao]

  const { data: fila } = useTasks({ status: ['inbox'] })
  const { data: vencendo } = useTasks({ dueBefore: fimDeHoje() })

  return (
    <footer
      // Aninhado como está, `footer` sozinho vira um contêiner sem papel — e sem papel
      // não aceita nome. O papel explícito é o que faz esta linha ser encontrável por
      // quem navega por marcos.
      role="contentinfo"
      aria-label={COPY.barra}
      className={cn(
        'flex h-8 shrink-0 items-center gap-1 rounded-card bg-surface px-1.5',
        'text-[11px] text-ink-subtle',
      )}
    >
      {fila && fila.length > 0 ? (
        <Link
          to="/inbox"
          className="flex h-6 items-center gap-1.5 rounded-[6px] px-1.5 transition-colors hover:bg-surface-raised hover:text-ink"
        >
          <Inbox aria-hidden="true" className="size-3.5" />
          <span className="tabular">{fila.length}</span>
          <span className="max-sm:sr-only">{COPY.inbox}</span>
        </Link>
      ) : null}

      {vencendo && vencendo.length > 0 ? (
        <Link
          to="/today"
          className="flex h-6 items-center gap-1.5 rounded-[6px] px-1.5 transition-colors hover:bg-surface-raised hover:text-ink"
        >
          <CircleDot aria-hidden="true" className="size-3.5" />
          <span className="tabular">{vencendo.length}</span>
          <span className="max-sm:sr-only">{COPY.vencem}</span>
        </Link>
      ) : null}

      <span className="flex-1" />

      {/* O estado da conexão não é botão: não há o que fazer com ele além de saber. */}
      <span className={cn('flex items-center gap-1.5 px-1.5', estado.cor)}>
        {conexao === 'offline' ? <WifiOff aria-hidden="true" className="size-3.5" /> : null}
        <span aria-live="polite">{estado.texto}</span>
      </span>

      <button
        type="button"
        onClick={onAgente}
        aria-expanded={agenteAberto}
        title={`${COPY.agente} (${COPY.atalho})`}
        className={cn(
          'flex h-6 items-center gap-1.5 rounded-[6px] px-2 transition-colors',
          agenteAberto
            ? 'bg-surface-raised font-medium text-ink'
            : 'hover:bg-surface-raised hover:text-ink',
        )}
      >
        <Sparkles aria-hidden="true" className="size-3.5 text-iris" />
        {COPY.agente}
      </button>
    </footer>
  )
}

/** Fim do dia local, em ISO — o corte de "vence hoje ou já venceu". */
function fimDeHoje(): string {
  const hoje = new Date()
  return new Date(`${toDateInputValue(hoje)}T23:59:59`).toISOString()
}
