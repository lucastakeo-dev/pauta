import { Calendar, CalendarRange, Columns2, type LucideIcon } from 'lucide-react'
import { cn } from '../../shared/lib/cn.js'
import { SidebarGroup } from '../../shared/ui/sidebar-group.js'
import { sidebarRow, sidebarRowActive, sidebarRowIdle } from '../../shared/ui/sidebar-row.js'
import { useSidebarChoice } from '../../shared/ui/sidebar-slot.js'

const COPY = {
  titulo: 'Telas',
}

export const PLANNER_VIEWS = ['dia', 'semana', 'calendario'] as const
export type PlannerView = (typeof PLANNER_VIEWS)[number]

const TELAS: { id: PlannerView; label: string; descricao: string; icon: LucideIcon }[] = [
  { id: 'dia', label: 'Dia', descricao: 'Lista e grade lado a lado', icon: Columns2 },
  { id: 'semana', label: 'Semana', descricao: 'Sete dias na mesma grade', icon: CalendarRange },
  {
    id: 'calendario',
    label: 'Só o calendário',
    descricao: 'A grade sozinha, na largura toda',
    icon: Calendar,
  },
]

/**
 * As telas do planner, na barra.
 *
 * Elas vivem aqui e não numa faixa de abas sobre a grade porque o painel é o lugar onde
 * a pessoa escolhe o que a seção mostra — o trilho troca de seção, o painel troca o que
 * há dentro dela. Uma faixa de abas repetiria essa função e comeria altura da grade.
 */
export function PlannerViewSwitcher({
  value,
  onChange,
}: {
  value: PlannerView
  onChange: (view: PlannerView) => void
}) {
  // Na tela estreita a barra é gaveta: escolher a tela também precisa fechá-la, senão
  // ela fica por cima da grade que acabou de ser pedida.
  const escolheu = useSidebarChoice()

  return (
    <SidebarGroup title={COPY.titulo}>
      {TELAS.map((tela) => {
        const ativa = value === tela.id
        const Icon = tela.icon

        return (
          <button
            key={tela.id}
            type="button"
            onClick={() => {
              onChange(tela.id)
              escolheu()
            }}
            aria-pressed={ativa}
            title={tela.descricao}
            className={cn(sidebarRow, ativa ? sidebarRowActive : sidebarRowIdle)}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{tela.label}</span>
          </button>
        )
      })}
    </SidebarGroup>
  )
}
