import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { createContext, type ReactNode, useContext, useState } from 'react'
import { type DropZone, dropTarget, type ProjectNode } from '../../entities/project/index.js'
import { useMoveProject } from './queries.js'

/**
 * O ponteiro precisa andar um pouco antes de virar arrasto. Sem isso, clicar num
 * projeto para abri-lo seria interpretado como começo de arraste.
 */
const DRAG_ACTIVATION_DISTANCE_PX = 6

/**
 * Faixas da linha: os 28% de cima e de baixo reordenam, o miolo aninha.
 *
 * O miolo é a maior fatia porque aninhar é o gesto que precisa de mira folgada — as
 * bordas ficam a poucos pixels da linha vizinha, que também as oferece.
 */
const BORDA = 0.28

type Indicador = { overId: string; zone: DropZone } | null

const IndicadorContext = createContext<Indicador>(null)

/** Onde a soltura cairia agora. `null` quando nada está sendo arrastado. */
export function useDropIndicator(): Indicador {
  return useContext(IndicadorContext)
}

/**
 * Arrastar para reordenar e para trocar de pai, na mesma árvore.
 *
 * Um alvo de soltura por linha, e a faixa vertical decide o que o gesto significa: em
 * cima entra antes, embaixo entra depois, no meio vira filho. A alternativa — uma linha
 * fina de soltura entre cada par de irmãos — dobraria o número de alvos e daria mira de
 * três pixels em cada um.
 *
 * A validação do gesto é a mesma função que calcula o destino (`dropTarget`), então o
 * indicador nunca promete uma soltura que o servidor recusaria: arrastar um projeto para
 * dentro da própria subárvore simplesmente não acende nada.
 */
export function ProjectDndProvider({
  roots,
  children,
}: {
  roots: ProjectNode[]
  children: ReactNode
}) {
  const move = useMoveProject()
  const [indicador, setIndicador] = useState<Indicador>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX } }),
  )

  /**
   * Em que faixa da linha de destino o ponteiro está.
   *
   * A conta parte do ponteiro (evento de origem + deslocamento), e não do retângulo do
   * que está sendo arrastado: a pessoa mira com o cursor, e o retângulo erraria por
   * metade da altura da linha.
   */
  function alvoDe(event: DragMoveEvent | DragEndEvent): Indicador {
    const { active, over, delta, activatorEvent } = event
    if (!over || over.id === active.id) return null
    if (!(activatorEvent instanceof MouseEvent)) return null

    const razao = (activatorEvent.clientY + delta.y - over.rect.top) / over.rect.height
    const zone: DropZone = razao < BORDA ? 'before' : razao > 1 - BORDA ? 'after' : 'inside'

    // Gesto proibido não acende indicador: prometer uma soltura que o servidor recusa
    // é pior do que não oferecer o gesto.
    if (!dropTarget(roots, String(active.id), String(over.id), zone)) return null

    return { overId: String(over.id), zone }
  }

  function aoSoltar(event: DragEndEvent) {
    const alvo = alvoDe(event)
    setIndicador(null)
    if (!alvo) return

    const destino = dropTarget(roots, String(event.active.id), alvo.overId, alvo.zone)
    if (!destino) return

    move.mutate({
      id: String(event.active.id),
      input: {
        parentId: destino.parentId,
        ...(destino.position !== undefined ? { position: destino.position } : {}),
      },
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragMove={(event) => setIndicador(alvoDe(event))}
      onDragEnd={aoSoltar}
      onDragCancel={() => setIndicador(null)}
    >
      <IndicadorContext.Provider value={indicador}>{children}</IndicadorContext.Provider>
    </DndContext>
  )
}
