import type { ProjectView } from '@pauta/contracts'
import { Archive, ArchiveRestore, CornerUpRight, Ellipsis, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  buildProjectTree,
  containsProject,
  findProject,
  flattenProjectTree,
} from '../../entities/project/index.js'
import { cn } from '../../shared/lib/cn.js'
import { ConfirmDialog } from '../../shared/ui/confirm-dialog.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../shared/ui/dropdown-menu.js'
import { IconButton } from '../../shared/ui/icon-button.js'
import { EditProjectDialog } from './project-dialog.js'
import { useArchiveProject, useDeleteProject, useMoveProject, useProjects } from './queries.js'

const COPY = {
  acoes: 'Ações do projeto',
  editar: 'Editar',
  mover: 'Mover para',
  raiz: 'Raiz',
  semDestino: 'Nenhum outro projeto.',
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
  const move = useMoveProject()
  const { data: projects } = useProjects()

  /*
    Para onde este projeto pode ir: qualquer um que não seja ele mesmo, que não esteja
    na subárvore dele (isso o desligaria da raiz) e que não seja o pai que ele já tem.
  */
  const arvore = buildProjectTree(projects ?? [])
  const eu = findProject(arvore, project.id)
  const destinos = flattenProjectTree(arvore).filter(
    (candidato) =>
      candidato.id !== project.id &&
      candidato.id !== project.parentId &&
      !(eu && containsProject(eu, candidato.id)),
  )

  const mover = (parentId: string | null) => move.mutate({ id: project.id, input: { parentId } })

  const [editando, setEditando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const arquivado = project.archivedAt !== null

  return (
    <>
      {/*
        `modal={false}`: com o menu modal, a camada que ele monta para capturar o clique
        de fora continua viva por um instante depois de escolher o item, e o diálogo que
        abre em seguida interpreta esse `pointerup` como "clicou fora" — abre e fecha no
        mesmo quadro, dependendo de quem ganha a corrida. Sem a camada, não há corrida.
      */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <IconButton aria-label={`${COPY.acoes}: ${project.name}`} title={COPY.acoes}>
              <Ellipsis aria-hidden="true" className="size-3.5" />
            </IconButton>
          )}
        </DropdownMenuTrigger>

        {/*
          Sem isto, o menu devolve o foco ao gatilho no instante em que o diálogo pede
          o foco para si, e o diálogo entende o movimento como "clicou fora" e fecha
          antes de aparecer. Radix chama isso ao fechar; aqui quem manda no foco é o
          diálogo que está abrindo.
        */}
        <DropdownMenuContent
          align="end"
          className="w-44"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DropdownMenuItem onSelect={() => setEditando(true)}>
            <Pencil aria-hidden="true" className="size-4" />
            {COPY.editar}
          </DropdownMenuItem>

          {/* O caminho de teclado para mover. Arrastar é gesto de ponteiro, e sem este
              item quem navega pelo teclado não teria como trocar um projeto de pai. */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CornerUpRight aria-hidden="true" className="size-4" />
              {COPY.mover}
            </DropdownMenuSubTrigger>

            <DropdownMenuSubContent className="max-h-72 w-52 overflow-y-auto">
              {project.parentId !== null ? (
                <DropdownMenuItem onSelect={() => mover(null)}>{COPY.raiz}</DropdownMenuItem>
              ) : null}

              {destinos.map((destino) => (
                <DropdownMenuItem key={destino.id} onSelect={() => mover(destino.id)}>
                  {/* O recuo vai no texto: o item de menu não tem coluna de hierarquia,
                      e sem ele a lista plana perde a árvore que a barra mostra. */}
                  <span className="truncate">
                    {'— '.repeat(destino.depth)}
                    {destino.name}
                  </span>
                </DropdownMenuItem>
              ))}

              {destinos.length === 0 && project.parentId === null ? (
                <DropdownMenuItem disabled>{COPY.semDestino}</DropdownMenuItem>
              ) : null}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

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
