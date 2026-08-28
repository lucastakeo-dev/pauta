import { useEffect, useState } from 'react'

/** Campos onde Cmd+K deve continuar valendo — o console é justamente para sair deles. */
const EDITABLE = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Atalho global do console: `Cmd+K` no Mac, `Ctrl+K` no resto.
 *
 * O ouvinte fica na janela em fase de captura para funcionar mesmo com o foco dentro
 * de um campo — capturar rápido tem que valer no meio de qualquer digitação.
 */
export function useConsoleShortcut(): { open: boolean; setOpen: (open: boolean) => void } {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handle(event: globalThis.KeyboardEvent) {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'

      if (isShortcut) {
        event.preventDefault()
        setOpen((current) => !current)
        return
      }

      // Esc fecha, mas só quando o foco não está num campo — dentro do console o
      // próprio overlay trata, e fora dele Esc pode ter outro dono.
      if (event.key === 'Escape' && !EDITABLE.has(document.activeElement?.tagName ?? '')) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handle, true)
    return () => window.removeEventListener('keydown', handle, true)
  }, [])

  return { open, setOpen }
}
