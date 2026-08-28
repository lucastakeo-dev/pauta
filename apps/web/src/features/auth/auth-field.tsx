import { type InputHTMLAttributes, useId } from 'react'
import { cn } from '../../shared/lib/cn.js'

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | undefined
  hint?: string | undefined
}

/**
 * Campo do formulário de entrada.
 *
 * Mora na feature, e não em `shared/ui`, porque tem um consumidor só e veste o tema
 * claro da superfície pública — o app é escuro. Quando o app precisar de um campo, ele
 * faz o dele; abstrair antes disso seria inventar uma API de variantes sem demanda.
 *
 * A ligação por `aria-describedby` e `aria-invalid` é o que faz o leitor de tela
 * anunciar o erro junto do campo — por isso o componente cuida disso, e não cada tela.
 */
export function AuthField({ label, error, hint, className, id, ...props }: AuthFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="font-medium text-graphite-soft text-sm">
        {label}
      </label>

      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          'h-12 rounded-xl border bg-paper px-4 text-graphite text-[15px]',
          'placeholder:text-graphite-faint',
          'transition-colors outline-none',
          error ? 'border-danger focus:border-danger' : 'border-rule focus:border-graphite/50',
          className,
        )}
        {...props}
      />

      {hint && !error ? (
        <p id={hintId} className="text-graphite-faint text-xs">
          {hint}
        </p>
      ) : null}

      {error ? (
        // `role="alert"` faz o leitor de tela anunciar assim que o erro aparece.
        <p id={errorId} role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : null}
    </div>
  )
}
