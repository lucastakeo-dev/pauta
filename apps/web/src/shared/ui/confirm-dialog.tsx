import type { ReactNode } from 'react'
import { Button } from './button.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog.js'

const COPY = {
  cancelar: 'Cancelar',
}

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: string
  /** O que vai acontecer, em uma frase. Não é enfeite: é o que sustenta a decisão. */
  descricao: ReactNode
  confirmar: string
  onConfirm: () => void
  /** `true` quando a ação apaga algo. Pinta o botão de confirmar. */
  destrutivo?: boolean
  carregando?: boolean
}

/**
 * Confirmação para o que não volta atrás.
 *
 * A descrição carrega o peso: "Tem certeza?" não informa nada, enquanto "as tarefas
 * voltam para a inbox e os subprojetos sobem para a raiz" é exatamente o que a pessoa
 * precisa saber antes de clicar — e é o efeito que o servidor tem hoje sem contar a
 * ninguém.
 *
 * O foco começa em Cancelar, e não no botão perigoso: Enter logo após abrir é o gesto
 * de quem ainda está lendo.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  titulo,
  descricao,
  confirmar,
  onConfirm,
  destrutivo = false,
  carregando = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          {/* O foco começa aqui, e não no botão que apaga: Enter logo após abrir é o
              gesto de quem ainda está lendo a frase acima. */}
          <Button variant="ghost" autoFocus onClick={() => onOpenChange(false)}>
            {COPY.cancelar}
          </Button>

          <Button
            variant={destrutivo ? 'danger' : 'primary'}
            loading={carregando}
            onClick={onConfirm}
          >
            {confirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
