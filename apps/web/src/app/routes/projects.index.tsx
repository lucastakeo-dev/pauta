import { createFileRoute } from '@tanstack/react-router'
import { ProjectsPage } from '../../pages/projects-page.js'
import { AppShell } from '../app-shell.js'
import { RequireSession } from '../require-session.js'

export const Route = createFileRoute('/projects/')({
  component: () => (
    <RequireSession>
      <AppShell>
        <ProjectsPage />
      </AppShell>
    </RequireSession>
  ),
})
