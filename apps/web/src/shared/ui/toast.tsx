import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { cn } from '../lib/cn.js'

const COPY = {
  dispensar: 'Dispensar aviso',
}

/**
 * Tempo na tela. A falha fica mais porque costuma pedir uma decisão — tentar de novo,
 * conferir a conexão; a confirmação só precisa ser vista.
 */
const DURACAO_MS = { success: 3500, error: 6000 } as const

/** Teto de avisos simultâneos. Acima disso o mais antigo sai. */
const MAXIMO = 3

type Tone = keyof typeof DURACAO_MS

type Aviso = {
  id: number
  tone: Tone
  message: string
  /** Quantas vezes a mesma mensagem chegou seguida. Vira "×3" ao lado do texto. */
  count: number
}

type ToastContextValue = {
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Retorno visual das ações.
 *
 * Toda escrita passa por aqui — criar, editar, excluir, concluir — e não só as que
 * falham. É a regra do produto: se a pessoa mandou fazer algo, ela recebe a resposta
 * no mesmo lugar, sem precisar procurar na tela o que mudou.
 *
 * Isso é o que torna a escrita otimista honesta. A tela aplica o efeito antes da
 * resposta; sem confirmação nenhuma, "aplicado" e "salvo" ficariam indistinguíveis, e
 * uma falha desfaria o efeito sem explicar por quê.
 *
 * Mensagens iguais seguidas viram uma só com contador. Concluir é a ação mais repetida
 * do app: sem isso, marcar cinco tarefas empilharia cinco avisos idênticos.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const proximoId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  /**
   * Espelho da lista, e a fonte de verdade para decidir o que fazer com o próximo aviso.
   *
   * Existe porque decidir dentro do updater do `setAvisos` seria impuro — o React chama
   * o updater duas vezes em StrictMode, e o contador de repetição sairia dobrado. Aqui
   * a decisão acontece antes, e o estado só recebe o resultado.
   */
  const lista = useRef<Aviso[]>([])

  const publicar = useCallback((proxima: Aviso[]) => {
    lista.current = proxima
    setAvisos(proxima)
  }, [])

  const dispensar = useCallback(
    (id: number) => {
      const timer = timers.current.get(id)
      if (timer) {
        clearTimeout(timer)
        timers.current.delete(id)
      }
      publicar(lista.current.filter((aviso) => aviso.id !== id))
    },
    [publicar],
  )

  const agendarSaida = useCallback(
    (id: number, tone: Tone) => {
      const anterior = timers.current.get(id)
      if (anterior) clearTimeout(anterior)
      timers.current.set(
        id,
        setTimeout(() => dispensar(id), DURACAO_MS[tone]),
      )
    },
    [dispensar],
  )

  // Timers pendentes viram vazamento se o provider sair da árvore antes deles.
  useEffect(() => {
    const pendentes = timers.current
    return () => {
      for (const timer of pendentes.values()) clearTimeout(timer)
      pendentes.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(() => {
    function notify(tone: Tone, message: string) {
      const atuais = lista.current
      const ultimo = atuais.at(-1)
      const repetiu = ultimo?.tone === tone && ultimo?.message === message

      const alvo = repetiu ? ultimo.id : proximoId.current + 1
      if (!repetiu) proximoId.current = alvo

      publicar(
        repetiu
          ? atuais.map((aviso) =>
              aviso.id === alvo ? { ...aviso, count: aviso.count + 1 } : aviso,
            )
          : [...atuais, { id: alvo, tone, message, count: 1 }].slice(-MAXIMO),
      )

      // Reagenda mesmo quando a mensagem só repetiu: o tempo conta da última vez.
      agendarSaida(alvo, tone)
    }

    return {
      success: (message: string) => notify('success', message),
      error: (message: string) => notify('error', message),
    }
  }, [agendarSaida, publicar])

  const porTom = (tone: Tone) => avisos.filter((aviso) => aviso.tone === tone)

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        // `data-slot` segue a convenção que veio com o shadcn. Aqui ele também é o que
        // separa estas regiões da que o dnd-kit injeta na página, que também é `status`.
        data-slot="toasts"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4"
      >
        {/*
          Duas regiões porque a urgência é diferente. A confirmação espera a próxima
          pausa da leitura; a falha corrige algo que a pessoa acabou de ver acontecer na
          tela, e esperar chegaria tarde demais.
        */}
        <Regiao
          role="status"
          ariaLive="polite"
          avisos={porTom('success')}
          onDispensar={dispensar}
        />
        <Regiao
          role="alert"
          ariaLive="assertive"
          avisos={porTom('error')}
          onDispensar={dispensar}
        />
      </div>
    </ToastContext.Provider>
  )
}

/**
 * As duas regiões não levam `aria-label`: `status` e `alert` não aceitam nome, e o
 * próprio papel já diz o que são. Quem lê a tela ouve a mensagem, que é o conteúdo —
 * um rótulo "Confirmações" antes dela só atrasaria o que interessa.
 */
function Regiao({
  role,
  ariaLive,
  avisos,
  onDispensar,
}: {
  role: 'status' | 'alert'
  ariaLive: 'polite' | 'assertive'
  avisos: Aviso[]
  onDispensar: (id: number) => void
}) {
  return (
    <div role={role} aria-live={ariaLive} className="flex flex-col items-center gap-2">
      {avisos.map((aviso) => (
        <div
          key={aviso.id}
          className={cn(
            'pointer-events-auto flex max-w-md items-start gap-3 rounded-control',
            'border bg-surface-overlay px-4 py-3 shadow-lg shadow-black/40',
            'animate-in fade-in-0 slide-in-from-bottom-3 duration-200 ease-entrance',
            aviso.tone === 'error' ? 'border-danger/40' : 'border-positive/40',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'mt-0.5 text-sm',
              aviso.tone === 'error' ? 'text-danger' : 'text-positive',
            )}
          >
            {aviso.tone === 'error' ? '⚠' : '✓'}
          </span>

          <p className="flex-1 text-ink text-sm">
            {aviso.message}
            {aviso.count > 1 ? (
              <span className="tabular ml-1.5 text-ink-subtle">×{aviso.count}</span>
            ) : null}
          </p>

          <button
            type="button"
            onClick={() => onDispensar(aviso.id)}
            aria-label={COPY.dispensar}
            className="shrink-0 rounded-[4px] px-1 text-ink-subtle text-xs transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast precisa estar dentro de <ToastProvider>.')
  return context
}
