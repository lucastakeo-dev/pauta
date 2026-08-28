import type { ListTasksQuery } from '@pauta/contracts'
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { buildProjectTree, type ProjectNode, projectPath } from '../entities/project/index.js'
import { NewProjectDialog } from '../features/projects/new-project-dialog.js'
import { ProjectTree } from '../features/projects/project-tree.js'
import { useProjects } from '../features/projects/queries.js'
import { TaskComposer } from '../features/tasks/task-composer.js'
import { TaskList } from '../features/tasks/task-list.js'
import { cn } from '../shared/lib/cn.js'
import { SidebarGroup } from '../shared/ui/sidebar-group.js'
import { SidebarSlot } from '../shared/ui/sidebar-slot.js'

const COPY = {
  projetos: 'Projetos',
  visaoGeral: 'Visão geral',
  tarefas: 'Tarefas',
  naoEncontrado: 'Projeto não encontrado.',
  carregando: 'Abrindo…',
  subprojetos: 'Subprojetos',
  semSubprojetos: 'Nenhum subprojeto. Crie um para dividir o trabalho.',
  novoSub: 'Novo subprojeto',
  emAberto: 'Em aberto',
  naSubarvore: 'Na subárvore',
  trilha: 'Trilha de navegação',
  abas: 'Seções do projeto',
}

const ABAS = [
  { id: 'overview', label: COPY.visaoGeral },
  { id: 'tasks', label: COPY.tarefas },
] as const

type Aba = (typeof ABAS)[number]['id']

/**
 * A página de um projeto, com abas.
 *
 * A visão geral existe para responder "como está isto" sem ler a lista inteira:
 * quanto falta aqui, quanto falta abaixo, e em que subprojetos. As tarefas ficam numa
 * aba porque a lista é longa — misturar as duas faria o resumo sumir na primeira rolagem.
 */
export function ProjectPage({ projectId }: { projectId: string }) {
  const { data: projects, isPending } = useProjects()
  const [aba, setAba] = useState<Aba>('overview')

  const arvore = buildProjectTree(projects ?? [])
  const caminho = projectPath(arvore, projectId)
  const projeto = caminho.at(-1)

  const query = useMemo<Partial<ListTasksQuery>>(
    () => ({ projectId, includeDone: false, rootOnly: true }),
    [projectId],
  )

  const barra = (
    <SidebarSlot>
      <SidebarGroup title={COPY.projetos} action={<NewProjectDialog />}>
        <ProjectTree selectedId={projectId} />
      </SidebarGroup>
    </SidebarSlot>
  )

  if (isPending) {
    return (
      <>
        {barra}
        <main className="flex-1 px-8 pt-8">
          <p role="status" aria-live="polite" className="text-ink-subtle text-sm">
            {COPY.carregando}
          </p>
        </main>
      </>
    )
  }

  if (!projeto) {
    return (
      <>
        {barra}
        <main className="flex-1 px-8 pt-8">
          <p role="alert" className="text-danger text-sm">
            {COPY.naoEncontrado}
          </p>
        </main>
      </>
    )
  }

  return (
    <>
      {barra}

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex flex-col gap-3 border-line border-b px-8 pt-6">
          <Trilha caminho={caminho} />

          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-[4px]"
              style={{ backgroundColor: projeto.color }}
            />
            <h1 className="font-semibold text-ink text-lg">{projeto.name}</h1>
          </div>

          {/* As abas ficam coladas na borda de baixo, como no Linear: a linha ativa
              continua a moldura em vez de flutuar solta acima dela. */}
          <nav aria-label={COPY.abas} className="-mb-px flex gap-1">
            {ABAS.map((item) => {
              const ativa = aba === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAba(item.id)}
                  aria-current={ativa ? 'page' : undefined}
                  className={cn(
                    'border-b-2 px-3 py-2 text-sm transition-colors',
                    ativa
                      ? 'border-iris text-ink'
                      : 'border-transparent text-ink-muted hover:text-ink',
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </header>

        <div className="flex flex-1 flex-col px-8 pt-6 pb-6">
          <div className="flex w-full max-w-3xl flex-col gap-6">
            {aba === 'overview' ? (
              <Overview projeto={projeto} />
            ) : (
              <>
                <TaskComposer projectId={projectId} />
                <TaskList query={query} />
              </>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

function Trilha({ caminho }: { caminho: ProjectNode[] }) {
  return (
    <nav aria-label={COPY.trilha} className="flex items-center gap-1 text-ink-subtle text-xs">
      <Link to="/projects" className="transition-colors hover:text-ink">
        {COPY.projetos}
      </Link>

      {/* O último é o título logo abaixo; repeti-lo aqui como link seria um link para
          a página em que já se está. */}
      {caminho.slice(0, -1).map((ancestral) => (
        <span key={ancestral.id} className="flex items-center gap-1">
          <ChevronRight aria-hidden="true" className="size-3" />
          <Link
            to="/projects/$projectId"
            params={{ projectId: ancestral.id }}
            className="transition-colors hover:text-ink"
          >
            {ancestral.name}
          </Link>
        </span>
      ))}
    </nav>
  )
}

function Overview({ projeto }: { projeto: ProjectNode }) {
  const abaixo = projeto.totalOpenTaskCount - projeto.openTaskCount

  return (
    <div className="flex flex-col gap-8">
      <dl className="flex gap-10">
        <Numero rotulo={COPY.emAberto} valor={projeto.openTaskCount} />
        {/* Só faz sentido quando há subárvore: sem filhos, os dois números são iguais. */}
        {projeto.childCount > 0 ? <Numero rotulo={COPY.naSubarvore} valor={abaixo} /> : null}
      </dl>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-medium text-ink text-sm">{COPY.subprojetos}</h2>
          <NewProjectDialog parentId={projeto.id} />
        </div>

        {projeto.children.length === 0 ? (
          <p className="text-ink-subtle text-sm">{COPY.semSubprojetos}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line/60 border-line/60 border-y">
            {projeto.children.map((filho) => (
              <li key={filho.id}>
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: filho.id }}
                  className="flex items-center gap-3 py-2.5 transition-colors hover:bg-surface/60"
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: filho.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-ink text-sm">{filho.name}</span>
                  <span className="tabular text-ink-subtle text-xs">
                    {filho.totalOpenTaskCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-ink-subtle text-xs uppercase tracking-wider">{rotulo}</dt>
      <dd className="tabular font-semibold text-2xl text-ink">{valor}</dd>
    </div>
  )
}
