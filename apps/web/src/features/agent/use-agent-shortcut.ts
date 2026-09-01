import { useEffect, useState } from 'react'

/**
 * Atalho do Agent: `Cmd+J` no Mac, `Ctrl+J` no resto.
 *
 * `J` porque `K` já é da captura rápida e as duas convivem: o `⌘K` registra o que você
 * já sabe que quer; o `⌘J` é para quando o pedido ainda é uma frase solta.
 *
 * O ouvinte fica na janela em fase de captura para valer mesmo com o foco num campo.
 * Esc não fecha por aqui: o painel tem conversa dentro, e fechar por engano custaria
 * o que foi escrito — quem fecha é o botão, dentro dele.
 */
export function useAgentShortcut(): { open: boolean; setOpen: (open: boolean) => void } {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handle(event: globalThis.KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'j') return

      event.preventDefault()
      setOpen((atual) => !atual)
    }

    window.addEventListener('keydown', handle, true)
    return () => window.removeEventListener('keydown', handle, true)
  }, [])

  return { open, setOpen }
}
