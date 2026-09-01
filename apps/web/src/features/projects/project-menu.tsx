import type { ProjectView } from '@pauta/contracts'
import { Archive, ArchiveRestore, Ellipsis, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../shared/lib/cn.js'
import { ConfirmDialog } from '../../shared/ui/confirm-dialog.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shared/ui/dropdown-menu.js'
import { IconButton } from '../../shared/ui/icon-button.js'
import { EditProjectDialog } from './project-dialog.js'
import { useArchiveProject, useDeleteProject } from './queries.js'

const COPY = {
  acoes: 'Ações do projeto',
  editar: 'Editar',
  arquivar: 'Arquivar',
  restaurar: 'Restaurar',
  excluir: 'Excluir',
  confirmarTitulo: 'Excluir este projeto?',
  confirmar: 'Excluir',
}

type ProjectMenuProps = {
  project: ProjectView
  /** Rótulo do gatilho — a linha da barra repete o nome do projeto nele. */
  trigger?: React.ReactNode
  /** Chamado depois de excluir. A página do projeto usa para sair dela. */
  onDeleted?: (() => void) | undefined
}

/**
 * O menu de uma linha de projeto: editar, arquivar e excluir.
 *
 * Virou menu quando a terceira ação apareceu. Três botões fixos numa coluna de 232px
 * empurrariam o nome para fora; e excluir a um clique de distância, ao lado de editar,
 * é acidente esperando acontecer.
 *
 * Os diálogos são controlados daqui porque o item de menu precisa se fechar antes de o
 * diálogo abrir: os dois disputam o foco, e o menu, ao desmontar, o devolveria para o
 * gatilho no exato instante em que o diálogo o pede.
 */
export function ProjectMenu({ project, trigger, onDeleted }: ProjectMenuProps) {
  const archive = useArchiveProject()
  const remove = useDeleteProject()

  const [editando, setEditando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const arquivado = project.archivedAt !== null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <IconButton aria-label={`${COPY.acoes}: ${project.name}`} title={COPY.acoes}>
              <Ellipsis aria-hidden="true" className="size-3.5" />
            </IconButton>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => setEditando(true)}>
            <Pencil aria-hidden="true" className="size-4" />
            {COPY.editar}
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => archive.mutate({ id: project.id, archived: !arquivado })}
          >
            {arquivado ? (
              <ArchiveRestore aria-hidden="true" className="size-4" />
            ) : (
              <Archive aria-hidden="true" className="size-4" />
            )}
            {arquivado ? COPY.restaurar : COPY.arquivar}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => setExcluindo(true)}
            className={cn('text-danger focus:bg-danger/15 focus:text-danger')}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {COPY.excluir}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditProjectDialog project={project} open={editando} onOpenChange={setEditando} />

      <ConfirmDialog
        open={excluindo}
        onOpenChange={setExcluindo}
        titulo={COPY.confirmarTitulo}
        // O que o servidor já faz hoje, dito antes e não depois: as tarefas sobrevivem
        // e os filhos também. Quem não sabe disso hesita em apagar qualquer coisa.
        descricao={
          <>
            <strong className="text-ink">{project.name}</strong> some das listas. As tarefas dele
            voltam para a inbox e os subprojetos sobem para a raiz — nada é apagado junto.
          </>
        }
        confirmar={COPY.confirmar}
        destrutivo
        carregando={remove.isPending}
        onConfirm={() => {
          remove.mutate(project.id)
          setExcluindo(false)
          // Quem está dentro do projeto precisa sair: sem isto a página ficaria
          // mostrando "Projeto não encontrado" para algo que a pessoa acabou de apagar.
          onDeleted?.()
        }}
      />
    </>
  )
}
