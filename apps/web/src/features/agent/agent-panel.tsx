import type { AgentMessage } from '@pauta/contracts'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowUp,
  Check,
  Maximize2,
  Minimize2,
  Minus,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react'
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { eventKeys } from '../../entities/event/index.js'
import { projectKeys } from '../../entities/project/index.js'
import { taskKeys } from '../../entities/task/index.js'
import { cn } from '../../shared/lib/cn.js'
import { askAgent } from './api.js'

const COPY = {
  titulo: 'Agent',
  fechar: 'Fechar o Agent',
  minimizar: 'Minimizar',
  restaurar: 'Restaurar',
  expandir: 'Expandir',
  encolher: 'Voltar ao tamanho normal',
  placeholder: 'O que você quer fazer?',
  enviar: 'Enviar',
  pensando: 'Pensando…',
  vazioTitulo: 'Peça em uma frase.',
  vazioAjuda: 'Ele lê e escreve nas suas tarefas, projetos e agenda — e não apaga nada.',
  exemplos: [
    'o que vence hoje?',
    'cria "revisar contrato" pra sexta, P1',
    'processa meu inbox: manda o que é de casa pro projeto Casa',
  ],
}

type Turno =
  | { autor: 'pessoa'; texto: string }
  | { autor: 'agente'; texto: string; acoes: { resumo: string; ok: boolean }[]; erro?: string }

/**
 * O painel do Agent.
 *
 * A conversa vive aqui, no cliente, e vai inteira a cada pedido — o servidor não guarda
 * sessão. Para conversas curtas e descartáveis, que é o caso, isso troca uma tabela de
 * mensagens por um array.
 *
 * Cada ferramenta que roda vira uma linha própria no turno, no instante em que roda. É
 * o que separa este painel de um chat: o que ele diz que fez está do lado do que ele
 * fez, e dá para conferir sem sair da tela.
 */
type Tamanho = 'normal' | 'minimizado' | 'expandido'

export function AgentPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [pergunta, setPergunta] = useState('')
  const [rodando, setRodando] = useState(false)
  const [tamanho, setTamanho] = useState<Tamanho>('normal')

  const fim = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLTextAreaElement>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rolar a cada mudança do texto que chega
  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end' })
  }, [turnos])

  useEffect(() => {
    campo.current?.focus()
  }, [])

  async function enviar(event?: FormEvent) {
    event?.preventDefault()

    const texto = pergunta.trim()
    if (!texto || rodando) return

    const historico: AgentMessage[] = [
      ...turnos.map((turno) => ({
        role: turno.autor === 'pessoa' ? ('user' as const) : ('assistant' as const),
        content: turno.texto || '…',
      })),
      { role: 'user', content: texto },
    ]

    setPergunta('')
    setRodando(true)
    setTurnos((atual) => [
      ...atual,
      { autor: 'pessoa', texto },
      { autor: 'agente', texto: '', acoes: [] },
    ])

    /** Mexe só no último turno, que é o do agente que está respondendo. */
    const atualizarUltimo = (mudanca: (turno: Extract<Turno, { autor: 'agente' }>) => Turno) =>
      setTurnos((atual) =>
        atual.map((turno, indice) =>
          indice === atual.length - 1 && turno.autor === 'agente' ? mudanca(turno) : turno,
        ),
      )

    try {
      await askAgent(historico, (evento) => {
        if (evento.type === 'texto') {
          atualizarUltimo((turno) => ({ ...turno, texto: turno.texto + evento.delta }))
        }

        if (evento.type === 'acao') {
          atualizarUltimo((turno) => ({
            ...turno,
            acoes: [...turno.acoes, { resumo: evento.resumo, ok: evento.ok }],
          }))
        }

        if (evento.type === 'erro') {
          atualizarUltimo((turno) => ({ ...turno, erro: evento.message }))
        }
      })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'O Agent não respondeu.'
      atualizarUltimo((turno) => ({ ...turno, erro: message }))
    } finally {
      setRodando(false)

      // O agente escreve nos mesmos dados que a tela mostra. Sem isto, a tarefa que ele
      // acabou de criar só apareceria na próxima navegação.
      void queryClient.invalidateQueries({ queryKey: taskKeys.all })
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
      void queryClient.invalidateQueries({ queryKey: eventKeys.all })
      campo.current?.focus()
    }
  }

  function aoTeclar(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter manda, Shift+Enter quebra linha: é um campo de pedido, não um editor.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void enviar()
    }
  }

  return (
    <section
      aria-label={COPY.titulo}
      /*
        Janela flutuante, e não uma coluna a mais na moldura: o Agent é conversa
        passageira sobre o que está na tela, e uma coluna fixa espremeria a tela toda
        vez — inclusive quando ele está só aberto, sem nada sendo perguntado.
        Ancorada no canto de baixo, saindo de onde o botão está.
      */
      className={cn(
        'fixed right-1.5 bottom-11 z-50 flex min-h-0 flex-col overflow-hidden',
        'rounded-card border border-line bg-surface shadow-2xl shadow-black/40',
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-150 ease-entrance',
        tamanho === 'expandido'
          ? 'h-[min(78vh,44rem)] w-[min(56rem,calc(100vw-1.5rem))]'
          : 'w-[400px]',
        tamanho === 'normal' && 'h-[min(60vh,34rem)]',
        // No celular ele ocupa a tela: 400px de janela flutuante em 390px de tela é
        // uma janela que não flutua em lugar nenhum.
        'max-sm:inset-1.5 max-sm:h-auto max-sm:w-auto',
      )}
    >
      <header className="flex h-11 shrink-0 items-center gap-2 border-line border-b pr-1.5 pl-3">
        <Sparkles aria-hidden="true" className="size-4 shrink-0 text-iris" />
        <h2 className="min-w-0 flex-1 truncate font-semibold text-ink text-sm">{COPY.titulo}</h2>

        <BotaoJanela
          onClick={() => setTamanho(tamanho === 'minimizado' ? 'normal' : 'minimizado')}
          rotulo={tamanho === 'minimizado' ? COPY.restaurar : COPY.minimizar}
        >
          <Minus aria-hidden="true" className="size-4" />
        </BotaoJanela>

        <BotaoJanela
          onClick={() => setTamanho(tamanho === 'expandido' ? 'normal' : 'expandido')}
          rotulo={tamanho === 'expandido' ? COPY.encolher : COPY.expandir}
          className="max-sm:hidden"
        >
          {tamanho === 'expandido' ? (
            <Minimize2 aria-hidden="true" className="size-4" />
          ) : (
            <Maximize2 aria-hidden="true" className="size-4" />
          )}
        </BotaoJanela>

        <BotaoJanela onClick={onClose} rotulo={COPY.fechar}>
          <X aria-hidden="true" className="size-4" />
        </BotaoJanela>
      </header>

      {tamanho === 'minimizado' ? null : (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
            {turnos.length === 0 ? (
              <div className="flex flex-col gap-2 py-6">
                <p className="font-medium text-ink text-sm">{COPY.vazioTitulo}</p>
                <p className="text-ink-subtle text-xs leading-relaxed">{COPY.vazioAjuda}</p>

                <ul className="mt-2 flex flex-col gap-1">
                  {COPY.exemplos.map((exemplo) => (
                    <li key={exemplo}>
                      <button
                        type="button"
                        onClick={() => {
                          setPergunta(exemplo)
                          campo.current?.focus()
                        }}
                        className={cn(
                          'w-full rounded-[8px] bg-surface-raised px-2 py-1.5 text-left',
                          'text-ink-muted text-xs transition-colors hover:text-ink',
                        )}
                      >
                        {exemplo}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {turnos.map((turno, indice) =>
              turno.autor === 'pessoa' ? (
                <p
                  // A conversa é uma lista sem chave estável: o índice é a ordem, e ela não muda.
                  // biome-ignore lint/suspicious/noArrayIndexKey: turnos só crescem no fim
                  key={indice}
                  className="self-end rounded-card bg-surface-raised px-3 py-2 text-ink text-sm"
                >
                  {turno.texto}
                </p>
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: turnos só crescem no fim
                <div key={indice} className="flex flex-col gap-2">
                  {turno.acoes.length > 0 ? (
                    <ul className="flex flex-col gap-1">
                      {turno.acoes.map((acao) => (
                        <li
                          key={acao.resumo}
                          className={cn(
                            'flex items-start gap-1.5 rounded-[8px] px-2 py-1 text-xs',
                            acao.ok ? 'text-ink-muted' : 'text-danger',
                          )}
                        >
                          {acao.ok ? (
                            <Check aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                          ) : (
                            <TriangleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                          )}
                          <span className="min-w-0">{acao.resumo}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {turno.texto ? (
                    <p className="whitespace-pre-wrap text-ink text-sm leading-relaxed">
                      {turno.texto}
                    </p>
                  ) : null}

                  {turno.erro ? (
                    <p role="alert" className="text-danger text-xs">
                      {turno.erro}
                    </p>
                  ) : null}

                  {rodando && indice === turnos.length - 1 && !turno.texto ? (
                    <p className="animate-pulse text-ink-subtle text-xs">{COPY.pensando}</p>
                  ) : null}
                </div>
              ),
            )}

            <div ref={fim} />
          </div>

          <form onSubmit={enviar} className="shrink-0 border-line border-t p-2">
            <div className="flex items-end gap-1.5 rounded-card border border-line bg-surface-raised p-1.5 transition-colors focus-within:border-iris">
              <textarea
                ref={campo}
                value={pergunta}
                onChange={(event) => setPergunta(event.target.value)}
                onKeyDown={aoTeclar}
                rows={2}
                placeholder={COPY.placeholder}
                aria-label={COPY.placeholder}
                className={cn(
                  'min-h-10 flex-1 resize-none bg-transparent px-1 py-1 text-ink text-sm',
                  'outline-none placeholder:text-ink-subtle',
                )}
              />

              <button
                type="submit"
                disabled={!pergunta.trim() || rodando}
                aria-label={COPY.enviar}
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-iris',
                  'text-canvas transition-colors hover:bg-iris-strong',
                  'disabled:cursor-not-allowed disabled:bg-surface-overlay disabled:text-ink-subtle',
                )}
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  )
}

/** Os três botões do cabeçalho da janela: minimizar, expandir, fechar. */
function BotaoJanela({
  rotulo,
  onClick,
  className,
  children,
}: {
  rotulo: string
  onClick: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-[8px] text-ink-subtle',
        'transition-colors hover:bg-surface-raised hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}
