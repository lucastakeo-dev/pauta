import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <Outlet />
    </div>
  )
}

function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2">
      <p className="font-semibold text-lg">Esta página não existe.</p>
      <a href="/" className="text-iris text-sm underline underline-offset-4">
        Voltar para o começo
      </a>
    </main>
  )
}
