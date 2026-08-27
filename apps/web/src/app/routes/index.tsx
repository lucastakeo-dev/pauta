import { createFileRoute } from '@tanstack/react-router'
import { TasksPage } from '../../pages/tasks-page.js'
import { RequireSession } from '../require-session.js'

// A raiz é a lista de tarefas até o planner existir (Fase 2), quando ela passa a ser
// "Hoje" e as tarefas ganham rota própria.
export const Route = createFileRoute('/')({
  component: () => (
    <RequireSession>
      <TasksPage />
    </RequireSession>
  ),
})
