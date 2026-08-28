import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '../../pages/landing-page.js'
import { RedirectIfSession } from '../require-session.js'

/**
 * A raiz é a vitrine, pública. Quem já tem sessão vai direto para o app — ver a
 * landing logado seria um passo a mais sem propósito.
 */
export const Route = createFileRoute('/')({
  component: () => (
    <RedirectIfSession to="/today">
      <LandingPage />
    </RedirectIfSession>
  ),
})
