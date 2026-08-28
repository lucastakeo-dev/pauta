import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '../../pages/login-page.js'
import { RedirectIfSession } from '../require-session.js'

export const Route = createFileRoute('/login')({
  component: () => (
    <RedirectIfSession>
      <LoginPage />
    </RedirectIfSession>
  ),
})
