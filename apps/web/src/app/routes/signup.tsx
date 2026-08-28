import { createFileRoute } from '@tanstack/react-router'
import { AuthPage } from '../../pages/auth-page.js'
import { RedirectIfSession } from '../require-session.js'

export const Route = createFileRoute('/signup')({
  component: () => (
    <RedirectIfSession>
      <AuthPage mode="signup" />
    </RedirectIfSession>
  ),
})
