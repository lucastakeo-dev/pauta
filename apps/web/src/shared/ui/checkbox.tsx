import { cn } from '../lib/cn.js'

type CheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  className?: string
}

/**
 * Caixa de marcar desenhada, mas ainda um `<input type="checkbox">` de verdade por
 * baixo: teclado, leitor de tela e autofill continuam funcionando de graça.
 *
 * O `label` não aparece na tela — o texto ao lado é a própria tarefa. Ele existe para
 * quem navega por leitor de tela ouvir "concluir Comprar café" em vez de só "caixa".
 */
export function Checkbox({ checked, onChange, label, className }: CheckboxProps) {
  return (
    <label className={cn('group relative inline-flex cursor-pointer items-center', className)}>
      {/*
        O input fica invisível mas ocupa toda a área do controle, em vez de `sr-only`
        fora do fluxo. Assim o alvo de clique é o próprio input: o quadrado desenhado
        nunca intercepta o toque, e o alvo continua do tamanho visível.
      */}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0"
      />
      <span className="sr-only">{label}</span>

      <span
        aria-hidden="true"
        className={cn(
          'flex size-[18px] items-center justify-center rounded-[6px] border',
          'transition-[colors,transform] duration-150 ease-press group-active:scale-90',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-iris peer-focus-visible:outline-offset-2',
          checked
            ? 'border-iris bg-iris text-canvas'
            : 'border-line-strong bg-transparent group-hover:border-iris',
        )}
      >
        {checked ? (
          // O rótulo acessível vem do `sr-only` acima; o ícone é puramente decorativo.
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            // O risco é desenhado em vez de aparecer pronto: concluir é a ação mais
            // repetida do app, e ver o traço acontecer é o que a torna satisfatória.
            className="size-3 animate-in zoom-in-50 duration-150 ease-entrance"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M2.5 6.5 5 9l4.5-5.5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
    </label>
  )
}
