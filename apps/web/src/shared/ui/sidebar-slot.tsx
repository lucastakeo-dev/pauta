import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

type SlotContextValue = {
  target: HTMLElement | null
  registrar: (element: HTMLElement | null) => void
}

const SlotContext = createContext<SlotContextValue | null>(null)

/**
 * Encaixe para a parte da barra lateral que muda conforme a tela.
 *
 * Existe por causa da direção das camadas. A barra é do `app/` — é moldura, e a mesma
 * em todas as telas logadas. Mas o trecho de baixo dela é conteúdo de página: filtros de
 * projeto em Hoje, lista de páginas em Notas. A página não pode importar de `app/`
 * (o Biome recusa), e passar por prop obrigaria a rota a segurar o estado da página.
 *
 * Então a página renderiza o trecho onde ele nasce, junto do estado que o alimenta, e um
 * portal o entrega dentro da barra. O portal preserva o contexto do React, então o que é
 * renderizado aqui continua enxergando os providers da página como se estivesse lá.
 */
export function SidebarSlotProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const value = useMemo<SlotContextValue>(() => ({ target, registrar: setTarget }), [target])

  return <SlotContext.Provider value={value}>{children}</SlotContext.Provider>
}

/** Onde o conteúdo cai. Fica na barra lateral, dentro do provider. */
export function SidebarSlotTarget({ className }: { className?: string }) {
  const context = useContext(SlotContext)
  if (!context)
    throw new Error('<SidebarSlotTarget> precisa estar dentro de <SidebarSlotProvider>.')

  return <div ref={context.registrar} className={className} />
}

/** O que a página quer ver na barra lateral. Nada aparece até o alvo montar. */
export function SidebarSlot({ children }: { children: ReactNode }) {
  const context = useContext(SlotContext)
  if (!context) throw new Error('<SidebarSlot> precisa estar dentro de <SidebarSlotProvider>.')

  return context.target ? createPortal(children, context.target) : null
}
