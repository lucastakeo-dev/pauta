import { createFileRoute, useParams } from '@tanstack/react-router'
import { ProjectPage } from '../../pages/project-page.js'
import { AppShell } from '../app-shell.js'
import { RequireSession } from '../require-session.js'

export const Route = createFileRoute('/projects/$projectId')({
  component: Componente,
})

function Componente() {
  const { projectId } = useParams({ from: '/projects/$projectId' })

  return (
    <RequireSession>
      <AppShell>
        <ProjectPage projectId={projectId} />
      </AppShell>
    </RequireSession>
  )
}
