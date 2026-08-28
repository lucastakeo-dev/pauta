import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

const COPY = {
  regiao: 'Avisos',
  dispensar: 'Dispensar aviso',
}

/** Tempo na tela. Longo o bastante para uma frase ser lida sem pressa. */
const DURACAO_MS = 6000

type Aviso = { id: number; message: string }

type ToastContextValue = {
  /** Informa que uma ação falhou. O texto é lido por leitor de tela na hora. */
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Avisos de falha.
 *
 * Existe por causa das escritas otimistas: quando criar, editar ou excluir aplica o
 * efeito na tela antes da resposta, uma falha desfaz aquilo sozinha. Sem este aviso, a
 * pessoa veria a tarefa voltar do nada e concluiria que o app perdeu o trabalho dela.
 *
 * Só trata erro de propósito. Sucesso já se anuncia — a tarefa aparece, a linha some;
 * um aviso a mais seria ruído em cima de algo que a tela já mostrou.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const proximoId = useRef(0)

  const dispensar = useCallback((id: number) => {
    setAvisos((atuais) => atuais.filter((aviso) => aviso.id !== id))
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      error: (message: string) => {
        // Contador em vez de `Date.now`: duas falhas no mesmo milissegundo — o caso
        // comum, já que elas costumam vir da mesma rajada — teriam a mesma chave.
        proximoId.current += 1
        const id = proximoId.current
        setAvisos((atuais) => [...atuais, { id, message }])
        setTimeout(() => dispensar(id), DURACAO_MS)
      },
    }),
    [dispensar],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        // `assertive` porque o aviso corrige algo que a pessoa acabou de ver acontecer
        // na tela; esperar a próxima pausa da leitura chegaria tarde demais.
        role="alert"
        aria-live="assertive"
        aria-label={COPY.regiao}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4"
      >
        {avisos.map((aviso) => (
          <div
            key={aviso.id}
            className={[
              'pointer-events-auto flex max-w-md items-start gap-3 rounded-control',
              'border border-danger/40 bg-surface-overlay px-4 py-3 shadow-lg shadow-black/40',
              'animate-in fade-in-0 slide-in-from-bottom-3 duration-200 ease-entrance',
            ].join(' ')}
          >
            <span aria-hidden="true" className="mt-0.5 text-danger text-sm">
              ⚠
            </span>

            <p className="flex-1 text-ink text-sm">{aviso.message}</p>

            <button
              type="button"
              onClick={() => dispensar(aviso.id)}
              aria-label={COPY.dispensar}
              className="shrink-0 rounded-[4px] px-1 text-ink-subtle text-xs transition-colors hover:text-ink"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast precisa estar dentro de <ToastProvider>.')
  return context
}
