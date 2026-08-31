import { Link } from '@tanstack/react-router'
import { FolderTree } from 'lucide-react'
import { buildProjectTree, flattenProjectTree } from '../entities/project/index.js'
import { NewProjectDialog } from '../features/projects/project-dialog.js'
import { ProjectTree } from '../features/projects/project-tree.js'
import { useProjects } from '../features/projects/queries.js'
import { Button } from '../shared/ui/button.js'
import { NamedIcon } from '../shared/ui/icon-catalog.js'
import { SidebarGroup } from '../shared/ui/sidebar-group.js'
import { SidebarSlot } from '../shared/ui/sidebar-slot.js'

const COPY = {
  titulo: 'Projetos',
  novo: 'Novo projeto',
  vazioTitulo: 'Nenhum projeto ainda.',
  vazioAjuda: 'Projetos agrupam tarefas, e podem conter outros projetos.',
  aberto: 'em aberto',
  subprojeto: 'subprojeto',
  subprojetos: 'subprojetos',
  raiz: 'na raiz',
}

/**
 * Índice dos projetos: a visão de cima da árvore.
 *
 * Existe porque a barra lateral mostra a hierarquia, mas não cabe nela comparar — ver
 * de relance onde o trabalho pendente está acumulado. Aqui cada projeto é uma linha com
 * o total da subárvore, e a hierarquia aparece pelo recuo.
 */
export function ProjectsPage() {
  const { data: projects } = useProjects()

  const arvore = buildProjectTree(projects ?? [])
  const linhas = flattenProjectTree(arvore)

  return (
    <>
      <SidebarSlot>
        <SidebarGroup title={COPY.titulo} action={<NewProjectDialog />}>
          <ProjectTree />
        </SidebarGroup>
      </SidebarSlot>

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 pt-8 pb-6">
        <div className="flex w-full max-w-3xl flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-semibold text-ink text-lg">{COPY.titulo}</h1>

            <NewProjectDialog trigger={<Button>{COPY.novo}</Button>} />
          </div>

          {linhas.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-16 text-center">
              <FolderTree aria-hidden="true" className="mb-2 size-6 text-ink-subtle" />
              <p className="font-medium text-ink text-sm">{COPY.vazioTitulo}</p>
              <p className="text-ink-subtle text-sm">{COPY.vazioAjuda}</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-line/60 border-line/60 border-y">
              {linhas.map((node) => (
                <li key={node.id}>
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: node.id }}
                    className="flex items-center gap-3 py-3 pr-2 transition-colors hover:bg-surface/60"
                    style={{ paddingLeft: node.depth * 20 }}
                  >
                    <NamedIcon name={node.icon} className="size-4 shrink-0 text-ink-subtle" />

                    <span className="min-w-0 flex-1 truncate text-ink text-sm">{node.name}</span>

                    {node.childCount > 0 ? (
                      <span className="tabular text-ink-subtle text-xs">
                        {node.childCount}{' '}
                        {node.childCount === 1 ? COPY.subprojeto : COPY.subprojetos}
                      </span>
                    ) : null}

                    <span className="tabular w-28 text-right text-ink-muted text-xs">
                      {node.totalOpenTaskCount} {COPY.aberto}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  )
}
