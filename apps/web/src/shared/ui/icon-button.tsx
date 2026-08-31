import type { ComponentProps } from 'react'
import { cn } from '../lib/cn.js'

/**
 * Botão pequeno que carrega só um ícone.
 *
 * Vive nas pontas de linhas estreitas — a da barra lateral — onde aparecer sob o mouse
 * e sumir depois é o comportamento normal. Sempre precisa de `aria-label`: sem texto,
 * é o único nome que o botão tem.
 */
export function IconButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-[4px] text-ink-subtle',
        'transition-[colors,transform] duration-150 ease-press',
        'hover:bg-surface-raised hover:text-ink active:scale-90',
        className,
      )}
      {...props}
    />
  )
}
