import { createFileRoute } from '@tanstack/react-router'
import { InboxPage } from '../../pages/inbox-page.js'
import { AppShell } from '../app-shell.js'
import { RequireSession } from '../require-session.js'

export const Route = createFileRoute('/inbox')({
  component: () => (
    <RequireSession>
      <AppShell>
        <InboxPage />
      </AppShell>
    </RequireSession>
  ),
})
