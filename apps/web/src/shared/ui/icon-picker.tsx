import { useId } from 'react'
import { cn } from '../lib/cn.js'
import { ICON_OPTIONS } from './icon-catalog.js'

const COPY = {
  legenda: 'Ícone',
}

type IconPickerProps = {
  value: string
  onChange: (key: string) => void
}

/**
 * Grade de ícones.
 *
 * São rádios de verdade, um por ícone: assim as setas do teclado andam pela grade e o
 * leitor de tela anuncia "Casa, 41 de 48" sem nenhum `aria-*` inventado. O `<label>`
 * envolve o input, então clicar no desenho aciona o controle — o erro contrário, um
 * `span` por cima de um input escondido, já cobriu o alvo do clique uma vez aqui.
 */
export function IconPicker({ value, onChange }: IconPickerProps) {
  const grupo = useId()

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-2 font-medium text-ink-muted text-sm">{COPY.legenda}</legend>

      {/*
        Colunas de 36px com a folga toda nos vãos, e não colunas elásticas com o alvo
        centralizado: assim a primeira e a última coluna encostam nas bordas do campo de
        cima, e o realce do escolhido fica do tamanho do ícone em vez de um bloco de 48px
        em volta de um desenho de 16.
      */}
      <div className="grid grid-cols-[repeat(8,2.25rem)] justify-between gap-y-2">
        {ICON_OPTIONS.map(({ key, label, Icon }) => {
          const escolhido = value === key

          return (
            <label
              key={key}
              className={cn(
                'flex size-9 cursor-pointer items-center justify-center rounded-[6px]',
                'transition-colors duration-100',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-iris',
                'has-[:focus-visible]:outline-offset-2',
                escolhido
                  ? 'bg-iris text-canvas'
                  : 'text-ink-subtle hover:bg-surface-raised hover:text-ink',
              )}
            >
              <input
                type="radio"
                name={grupo}
                value={key}
                checked={escolhido}
                onChange={() => onChange(key)}
                aria-label={label}
                className="sr-only"
              />
              <Icon aria-hidden="true" className="size-4" />
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
