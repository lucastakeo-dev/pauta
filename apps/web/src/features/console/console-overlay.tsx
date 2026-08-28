import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { describeDraft, parseCapture } from '../../entities/capture/index.js'
import { ApiRequestError } from '../../shared/api/client.js'
import { cn } from '../../shared/lib/cn.js'
import { useCapture, useCaptureResolution } from './use-capture.js'

const COPY = {
  titulo: 'Captura rápida',
  placeholder: 'O que precisa ser feito?',
  ajuda: 'amanhã 13h · toda segunda · #etiqueta · @projeto · p1',
  vazio: 'Escreva e o Pauta interpreta a data.',
  novoProjeto: 'novo projeto',
  novaEtiqueta: 'nova',
  salvar: 'Enter para salvar',
  fechar: 'Esc para fechar',
  erro: 'Não consegui salvar.',
}

type ConsoleOverlayProps = {
  onClose: () => void
}

/**
 * Overlay de captura rápida.
 *
 * A prévia é o coração da tela, não enfeite: como o parser não adivinha, ela é o que
 * mostra o que foi entendido — e o que será criado — antes de confirmar. Sem ela, um
 * "amanhã" mal interpretado só apareceria depois.
 */
export function ConsoleOverlay({ onClose }: ConsoleOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const capture = useCapture()

  // `now` fica congelado enquanto o console está aberto: recalcular a cada tecla faria
  // "daqui a 30 minutos" andar sozinho enquanto a pessoa digita o resto da frase.
  const now = useMemo(() => new Date(), [])

  const draft = useMemo(() => parseCapture(value, now), [value, now])
  const resumo = useMemo(() => describeDraft(draft, now), [draft, now])
  const { projectIsNew, newLabels } = useCaptureResolution(draft)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!draft.title.trim()) return

    setError(null)

    try {
      await capture.mutateAsync(draft)
      onClose()
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : COPY.erro)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
    }
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: o overlay captura Esc para todo o diálogo, inclusive quando o foco está num filho
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-canvas/70 px-4 pt-[18vh] backdrop-blur-sm"
      onKeyDown={handleKeyDown}
    >
      {/* Fundo clicável para fechar, como um botão de verdade e não um div com onClick. */}
      <button
        type="button"
        aria-label={COPY.fechar}
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={COPY.titulo}
        className="relative w-full max-w-xl overflow-hidden rounded-card border border-line-strong bg-surface shadow-2xl"
      >
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={COPY.placeholder}
            aria-label={COPY.titulo}
            className="h-14 w-full bg-transparent px-5 text-base text-ink outline-none placeholder:text-ink-subtle"
          />
        </form>

        <div className="flex min-h-[2.75rem] flex-wrap items-center gap-2 border-line border-t px-5 py-2.5">
          {value.trim() === '' ? (
            <span className="text-ink-subtle text-xs">{COPY.vazio}</span>
          ) : (
            <>
              {draft.title ? (
                <span className="font-medium text-ink text-xs">{draft.title}</span>
              ) : null}

              {resumo.map((parte) => (
                <span
                  key={parte}
                  className="rounded-[4px] bg-surface-raised px-1.5 py-0.5 text-ink-muted text-xs"
                >
                  {parte}
                </span>
              ))}

              {/* Aviso do que será criado: é o que impede um erro de digitação virar
                  projeto novo sem ninguém perceber. */}
              {projectIsNew ? (
                <span className="rounded-[4px] bg-warning/15 px-1.5 py-0.5 text-warning text-xs">
                  + {COPY.novoProjeto}
                </span>
              ) : null}

              {newLabels.map((name) => (
                <span
                  key={name}
                  className="rounded-[4px] bg-warning/15 px-1.5 py-0.5 text-warning text-xs"
                >
                  + #{name} {COPY.novaEtiqueta}
                </span>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-line border-t px-5 py-2">
          <span className="text-[11px] text-ink-subtle">{COPY.ajuda}</span>
          <span className={cn('text-[11px]', capture.isPending ? 'text-iris' : 'text-ink-subtle')}>
            {capture.isPending ? '…' : COPY.salvar}
          </span>
        </div>

        {error ? (
          <p role="alert" className="border-line border-t px-5 py-2 text-danger text-xs">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
