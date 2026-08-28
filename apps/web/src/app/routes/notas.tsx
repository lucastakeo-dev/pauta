import { createFileRoute } from '@tanstack/react-router'
import { NotesPage } from '../../pages/notes-page.js'
import { AppShell } from '../app-shell.js'
import { RequireSession } from '../require-session.js'

export const Route = createFileRoute('/notas')({
  component: () => (
    <RequireSession>
      <AppShell>
        <NotesPage />
      </AppShell>
    </RequireSession>
  ),
})
