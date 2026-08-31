import { InboxQueue } from '../features/tasks/inbox-queue.js'
import { useTasks } from '../features/tasks/queries.js'
import { TaskDetail } from '../features/tasks/task-detail.js'
import { useInboxSelection } from '../features/tasks/use-inbox-selection.js'
import { SidebarGroup } from '../shared/ui/sidebar-group.js'
import { SidebarSlot } from '../shared/ui/sidebar-slot.js'

const COPY = {
  fila: 'Por processar',
}

/**
 * O inbox: a fila na barra, o item aberto na tela.
 *
 * Tudo que entra pelo `⌘K` nasce com status `inbox` e, até aqui, não tinha para onde
 * ir — capturar era fácil e decidir era impossível. Esta tela é a saída: abrir um item,
 * dar a ele projeto, prioridade, prazo ou hora, e processar.
 */
export function InboxPage() {
  const { data, isPending } = useTasks({ status: ['inbox'] })
  const fila = data ?? []
  const [selecionada, selecionar] = useInboxSelection(fila)

  return (
    <>
      <SidebarSlot>
        <SidebarGroup title={COPY.fila} count={isPending ? undefined : fila.length}>
          <InboxQueue
            tasks={fila}
            isPending={isPending}
            selectedId={selecionada?.id ?? null}
            onSelect={selecionar}
          />
        </SidebarGroup>
      </SidebarSlot>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TaskDetail
          task={selecionada}
          posicao={
            selecionada ? { atual: fila.indexOf(selecionada) + 1, total: fila.length } : undefined
          }
        />
      </main>
    </>
  )
}
