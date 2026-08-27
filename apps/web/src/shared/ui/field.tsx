import { type InputHTMLAttributes, useId } from 'react'
import { cn } from '../lib/cn.js'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | undefined
  hint?: string | undefined
}

/**
 * Campo de formulário com rótulo, dica e erro amarrados por id.
 *
 * A ligação via `aria-describedby` e `aria-invalid` é o que faz o leitor de tela
 * anunciar o erro junto do campo — por isso o componente cuida disso, e não cada tela.
 */
export function Field({ label, error, hint, className, id, ...props }: FieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="font-medium text-ink-muted text-sm">
        {label}
      </label>

      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          'h-10 rounded-control border bg-surface px-3 text-ink text-sm',
          'placeholder:text-ink-subtle',
          'transition-colors focus:border-iris',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...props}
      />

      {hint && !error ? (
        <p id={hintId} className="text-ink-subtle text-xs">
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
