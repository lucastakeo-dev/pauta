import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn.js'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline'
  loading?: boolean
  children: ReactNode
}

const VARIANTS = {
  primary: 'bg-iris text-canvas hover:bg-iris-strong disabled:hover:bg-iris',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-raised hover:text-ink',
  // Existe porque os componentes do shadcn a pedem — mantê-la aqui evita editar o
  // componente gerado, o que facilita atualizá-lo no futuro.
  outline: 'border border-line-strong bg-transparent text-ink hover:bg-surface-raised',
} as const

export function Button({
  variant = 'primary',
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      // Durante o loading o botão continua desabilitado, evitando envio duplicado.
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-control px-4',
        'font-medium text-sm transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  )
}
