import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react'
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
 * Cada tom com o seu desenho e o seu tempo.
 *
 * O tempo cresce com a urgência: a confirmação só precisa ser vista; o erro costuma
 * pedir uma decisão — tentar de novo, conferir a conexão — e sair antes de ser lido
 * seria o mesmo que não avisar.
 *
 * `papel` decide como o leitor de tela reage. `alert` interrompe a leitura, e isso é
 * caro: só o que pede ação imediata merece. Confirmação e informação esperam a próxima
 * pausa.
 */
const TONS = {
  success: { Icon: CircleCheck, cor: 'text-positive', duracao: 3500, papel: 'status' },
  info: { Icon: Info, cor: 'text-iris', duracao: 4500, papel: 'status' },
  warning: { Icon: TriangleAlert, cor: 'text-warning', duracao: 5500, papel: 'alert' },
  error: { Icon: CircleX, cor: 'text-danger', duracao: 6000, papel: 'alert' },
} as const

/** Teto de avisos simultâneos. Acima disso o mais antigo sai. */
const MAXIMO = 3

/**
 * Quanto dura a saída.
 *
 * O aviso não some no meio do quadro: ele sai marcado como "saindo", desliza de volta
 * para a borda e só então deixa a árvore. Sem esta pausa, dispensar era um corte seco —
 * o cartão simplesmente deixava de existir, e o olho não tinha para onde acompanhar.
 *
 * O tempo é curto de propósito: animação de saída longa atrasa quem já dispensou.
 */
const SAIDA_MS = 180

type Tone = keyof typeof TONS

export type ToastOptions = {
  /** A linha de baixo: o detalhe que o título não comporta. */
  description?: string
  /** Um caminho a seguir a partir do aviso — desfazer, abrir, tentar de novo. */
  action?: { label: string; onClick: () => void }
}

type Aviso = {
  id: number
  tone: Tone
  message: string
  options: ToastOptions
  /** Quantas vezes a mesma mensagem chegou seguida. Vira "×3" ao lado do texto. */
  count: number
  /** Já está deslizando para fora; continua na árvore só até a animação acabar. */
  saindo?: boolean
}

type Notificar = (message: string, options?: ToastOptions) => void

type ToastContextValue = {
  success: Notificar
  info: Notificar
  warning: Notificar
  error: Notificar
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
 * Os avisos moram no **canto superior direito**, empilhados. Embaixo e no centro eles
 * cobriam justamente o que a ação acabou de mudar — a lista de tarefas e a grade ficam
 * ali — e o rodapé é onde o olho menos passa depois de clicar.
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

  const remover = useCallback(
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

  /** Marca a saída e só então tira da árvore, para a animação ter o que animar. */
  const dispensar = useCallback(
    (id: number) => {
      const atual = lista.current.find((aviso) => aviso.id === id)
      // Dois cliques no mesmo `×` não podem reiniciar a saída pela metade.
      if (!atual || atual.saindo) return

      const timer = timers.current.get(id)
      if (timer) clearTimeout(timer)

      publicar(lista.current.map((aviso) => (aviso.id === id ? { ...aviso, saindo: true } : aviso)))
      timers.current.set(
        id,
        setTimeout(() => remover(id), SAIDA_MS),
      )
    },
    [publicar, remover],
  )

  const agendarSaida = useCallback(
    (id: number, tone: Tone) => {
      const anterior = timers.current.get(id)
      if (anterior) clearTimeout(anterior)
      timers.current.set(
        id,
        setTimeout(() => dispensar(id), TONS[tone].duracao),
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
    function notify(tone: Tone, message: string, options: ToastOptions = {}) {
      const atuais = lista.current
      const ultimo = atuais.at(-1)

      // Repetição é o mesmo aviso, não só o mesmo título: dois erros diferentes com o
      // mesmo cabeçalho contam duas histórias e precisam de duas linhas.
      const repetiu =
        ultimo?.tone === tone &&
        ultimo?.message === message &&
        ultimo?.options.description === options.description &&
        // Um aviso que já está saindo não recebe contador: ele vai embora em 180ms, e
        // o "×2" apareceria só para sumir junto.
        !ultimo.saindo

      const alvo = repetiu ? ultimo.id : proximoId.current + 1
      if (!repetiu) proximoId.current = alvo

      publicar(
        repetiu
          ? atuais.map((aviso) =>
              aviso.id === alvo ? { ...aviso, count: aviso.count + 1 } : aviso,
            )
          : [...atuais, { id: alvo, tone, message, options, count: 1 }].slice(-MAXIMO),
      )

      // Reagenda mesmo quando a mensagem só repetiu: o tempo conta da última vez.
      agendarSaida(alvo, tone)
    }

    return {
      success: (message, options) => notify('success', message, options),
      info: (message, options) => notify('info', message, options),
      warning: (message, options) => notify('warning', message, options),
      error: (message, options) => notify('error', message, options),
    }
  }, [agendarSaida, publicar])

  const porPapel = (papel: 'status' | 'alert') =>
    avisos.filter((aviso) => TONS[aviso.tone].papel === papel)

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        // `data-slot` segue a convenção que veio com o shadcn. Aqui ele também é o que
        // separa estas regiões da que o dnd-kit injeta na página, que também é `status`.
        data-slot="toasts"
        className={cn(
          'pointer-events-none fixed top-0 right-0 z-[60] flex w-full max-w-[23rem] flex-col',
          'gap-2 p-3 sm:p-4',
        )}
      >
        {/*
          Duas regiões porque a urgência é diferente. A confirmação espera a próxima
          pausa da leitura; a falha corrige algo que a pessoa acabou de ver acontecer na
          tela, e esperar chegaria tarde demais.
        */}
        <Regiao
          role="status"
          ariaLive="polite"
          avisos={porPapel('status')}
          onDispensar={dispensar}
        />
        <Regiao
          role="alert"
          ariaLive="assertive"
          avisos={porPapel('alert')}
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
    <div role={role} aria-live={ariaLive} className="flex flex-col gap-2">
      {avisos.map((aviso) => {
        const { Icon, cor } = TONS[aviso.tone]

        return (
          <div
            key={aviso.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-card border border-line',
              'bg-surface-overlay py-2.5 pr-2 pl-3 shadow-black/30 shadow-lg',
              // Entra e sai pela mesma borda: o movimento diz de onde o aviso veio, e é
              // por onde o olho o solta. Entrada um pouco mais lenta que a saída —
              // chegar pede atenção, ir embora não.
              aviso.saindo
                ? 'animate-out fade-out-0 slide-out-to-right-2 fill-mode-forwards duration-150 ease-press'
                : 'animate-in fade-in-0 slide-in-from-right-4 duration-250 ease-entrance',
            )}
          >
            <Icon aria-hidden="true" className={cn('mt-px size-4 shrink-0', cor)} />

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="font-medium text-[13px] text-ink">
                {aviso.message}
                {aviso.count > 1 ? (
                  <span className="tabular ml-1.5 font-normal text-ink-subtle">×{aviso.count}</span>
                ) : null}
              </p>

              {aviso.options.description ? (
                <p className="text-ink-muted text-xs leading-relaxed">
                  {aviso.options.description}
                </p>
              ) : null}

              {aviso.options.action ? (
                <button
                  type="button"
                  onClick={() => {
                    aviso.options.action?.onClick()
                    onDispensar(aviso.id)
                  }}
                  className={cn(
                    'mt-1 self-start rounded-[6px] font-medium text-iris text-xs',
                    'transition-colors hover:text-ink',
                  )}
                >
                  {aviso.options.action.label}
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => onDispensar(aviso.id)}
              aria-label={COPY.dispensar}
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-[6px] text-ink-subtle',
                'transition-colors hover:bg-surface-raised hover:text-ink',
              )}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast precisa estar dentro de <ToastProvider>.')
  return context
}
