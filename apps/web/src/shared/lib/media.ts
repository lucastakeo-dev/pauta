import { useEffect, useState } from 'react'

/** O ponto em que a barra deixa de caber ao lado da tela. Espelha o `md` do Tailwind. */
const DESKTOP = '(min-width: 768px)'

/**
 * A tela é larga o bastante para a barra morar ao lado?
 *
 * O layout responde sozinho no CSS; isto existe para o que o CSS não resolve: no
 * estreito a barra vira gaveta, e uma gaveta fechada precisa sair da ordem do Tab e da
 * árvore de acessibilidade — `inert` é atributo, não classe. Também é o que separa as
 * duas memórias: "painel recolhido" é preferência de quem usa no monitor; "gaveta
 * aberta" é estado do momento, e não se guarda.
 */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP).matches)

  useEffect(() => {
    const query = window.matchMedia(DESKTOP)
    const aoMudar = (evento: MediaQueryListEvent) => setDesktop(evento.matches)

    query.addEventListener('change', aoMudar)
    return () => query.removeEventListener('change', aoMudar)
  }, [])

  return desktop
}
