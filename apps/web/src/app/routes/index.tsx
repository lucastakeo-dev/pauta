import { createFileRoute } from '@tanstack/react-router'
import { PlannerPage } from '../../pages/planner-page.js'
import { RequireSession } from '../require-session.js'

export const Route = createFileRoute('/')({
  component: () => (
    <RequireSession>
      <PlannerPage />
    </RequireSession>
  ),
})
