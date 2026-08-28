import { createFileRoute } from '@tanstack/react-router'
import { AuthPage } from '../../pages/auth-page.js'
import { RedirectIfSession } from '../require-session.js'

export const Route = createFileRoute('/signin')({
  component: () => (
    <RedirectIfSession>
      <AuthPage mode="signin" />
    </RedirectIfSession>
  ),
})
