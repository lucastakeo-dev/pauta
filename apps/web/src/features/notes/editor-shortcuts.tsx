import { Keyboard } from 'lucide-react'
import { cn } from '../../shared/lib/cn.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../shared/ui/dialog.js'

const COPY = {
  botao: 'Atalhos',
  botaoAjuda: 'Atalhos do editor (⌘/)',
  titulo: 'Atalhos do editor',
  ajuda: 'O que muda ao digitar, e o que o teclado faz. Fora do Mac, ⌘ é Ctrl.',
  aoDigitar: 'Ao digitar',
  teclado: 'Teclado',
}

type Linha = { readonly atalho: string; readonly faz: string }

/**
 * Só o que existe e aparece. O editor também aceita `####` a `######`, mas o CSS veste
 * só três níveis — um título 4 nasce igual a um parágrafo, e legenda que promete o
 * que a tela não mostra vira reclamação.
 */
const AO_DIGITAR: readonly Linha[] = [
  { atalho: '# ## ###', faz: 'Título 1, 2 e 3 (com espaço depois)' },
  { atalho: '- ', faz: 'Lista' },
  { atalho: '1. ', faz: 'Lista numerada' },
  { atalho: '> ', faz: 'Citação' },
  { atalho: '```', faz: 'Bloco de código' },
  { atalho: '---', faz: 'Linha divisória' },
  { atalho: '**texto**', faz: 'Negrito' },
  { atalho: '*texto*', faz: 'Itálico' },
  { atalho: '~~texto~~', faz: 'Riscado' },
  { atalho: '`texto`', faz: 'Código em linha' },
  { atalho: '[[nome', faz: 'Link para outra nota' },
]

const TECLADO: readonly Linha[] = [
  { atalho: '⌘B  ⌘I  ⌘U', faz: 'Negrito, itálico, sublinhado' },
  { atalho: '⌘⇧S', faz: 'Riscado' },
  { atalho: '⌘E', faz: 'Código em linha' },
  { atalho: '⌘⌥1 a 3', faz: 'Título 1 a 3' },
  { atalho: '⌘⌥0', faz: 'Volta a parágrafo' },
  { atalho: '⌘⇧8  ⌘⇧7', faz: 'Lista, lista numerada' },
  { atalho: 'Tab  ⇧Tab', faz: 'Aninha, desaninha o item' },
  { atalho: '↵ ↵', faz: 'Em item vazio, sai da lista' },
  { atalho: '⌘⇧B', faz: 'Citação' },
  { atalho: '⇧↵', faz: 'Quebra de linha sem parágrafo' },
  { atalho: '⌘Z  ⌘⇧Z', faz: 'Desfaz, refaz' },
  { atalho: '⌘/', faz: 'Esta legenda' },
]

/**
 * Botão que abre a legenda. Mora na linha do indicador de autosave, com o mesmo peso:
 * é informação de canto, não ação da nota.
 */
export function EditorShortcutsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={COPY.botaoAjuda}
      className={cn(
        'flex h-4 items-center gap-1 rounded-[4px] px-1 text-[11px] text-ink-subtle',
        'transition-colors hover:bg-surface-raised hover:text-ink',
      )}
    >
      <Keyboard aria-hidden="true" className="size-3" />
      {COPY.botao}
    </button>
  )
}

/**
 * A legenda. Os atalhos vêm todos do `StarterKit` do Tiptap, menos o `[[nome`, que é
 * do projeto — e nenhum estava escrito em lugar algum: o placeholder só falava do link.
 *
 * Ao fechar, o foco volta ao texto e não ao botão: quem consulta a legenda quer usar
 * o atalho em seguida, e a abertura por `⌘/` nem passou pelo botão.
 */
export function EditorShortcutsDialog({
  open,
  onOpenChange,
  onFechar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFechar: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-3rem)] gap-0 overflow-hidden p-0 sm:max-w-lg"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onFechar()
        }}
      >
        <DialogHeader className="border-line border-b px-5 py-3">
          <DialogTitle>{COPY.titulo}</DialogTitle>
          <DialogDescription>{COPY.ajuda}</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-5 py-4 sm:grid-cols-2">
          <Grupo titulo={COPY.aoDigitar} linhas={AO_DIGITAR} />
          <Grupo titulo={COPY.teclado} linhas={TECLADO} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Grupo({ titulo, linhas }: { titulo: string; linhas: readonly Linha[] }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h3 className="font-mono text-[11px] text-ink-subtle uppercase tracking-wide">{titulo}</h3>

      <dl className="flex flex-col divide-y divide-line">
        {linhas.map((linha) => (
          <div
            key={linha.atalho}
            className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 py-1.5"
          >
            <dt className="whitespace-pre font-mono text-ink text-xs">{linha.atalho}</dt>
            <dd className="text-ink-muted text-xs">{linha.faz}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
