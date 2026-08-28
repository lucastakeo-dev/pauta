import { createFileRoute } from '@tanstack/react-router'
import { PlannerPage } from '../../pages/planner-page.js'
import { AppShell } from '../app-shell.js'
import { RequireSession } from '../require-session.js'

export const Route = createFileRoute('/today')({
  component: () => (
    <RequireSession>
      <AppShell>
        <PlannerPage />
      </AppShell>
    </RequireSession>
  ),
})
