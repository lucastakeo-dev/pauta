import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { buildProjectTree, type ProjectNode } from '../../entities/project/index.js'
import { cn } from '../../shared/lib/cn.js'
import { NewProjectDialog } from './new-project-dialog.js'
import { useProjects } from './queries.js'

const COPY = {
  todas: 'Todas',
  vazio: 'Nenhum projeto ainda.',
  expandir: 'Expandir',
  recolher: 'Recolher',
  abrir: 'Abrir projeto',
}

/** Recuo por nível. Suficiente para ler a hierarquia sem empurrar o nome para fora. */
const RECUO_PX = 12

type ProjectTreeProps = {
  /** Projeto em foco, para marcar a linha. */
  selectedId?: string | undefined
  /**
   * O que o clique no nome faz. Sem isto a linha vira um link para a página do projeto —
   * é a diferença entre a barra do planner, que filtra, e a das outras telas, que navega.
   *
   * Recebe `null` quando a pessoa escolhe "Todas".
   */
  onSelect?: ((id: string | null) => void) | undefined
}

export function ProjectTree({ selectedId, onSelect }: ProjectTreeProps) {
  const { data: projects } = useProjects()
  const [recolhidos, setRecolhidos] = useState<ReadonlySet<string>>(() => new Set())

  const arvore = buildProjectTree(projects ?? [])

  function alternar(id: string) {
    setRecolhidos((atuais) => {
      const proximo = new Set(atuais)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  if (projects && projects.length === 0) {
    return <p className="px-2 py-1 text-ink-subtle text-xs">{COPY.vazio}</p>
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {/*
        Só no modo filtro. Sem esta linha, largar o filtro dependeria de descobrir que
        clicar de novo no projeto ativo o solta — e ninguém descobre isso sozinho.
        No modo navegação ela não faria sentido: o índice já é a visão de tudo.
      */}
      {onSelect ? (
        <li>
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-pressed={!selectedId}
            className={cn(
              'flex w-full items-center gap-2 rounded-control py-1.5 pr-2 pl-6 text-left text-sm',
              'transition-[colors,transform] duration-150 ease-press active:scale-[0.98]',
              selectedId
                ? 'text-ink-muted hover:bg-surface hover:text-ink'
                : 'bg-surface-raised text-ink',
            )}
          >
            {COPY.todas}
          </button>
        </li>
      ) : null}

      {arvore.map((node) => (
        <Node
          key={node.id}
          node={node}
          recolhidos={recolhidos}
          onToggle={alternar}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}

function Node({
  node,
  recolhidos,
  onToggle,
  selectedId,
  onSelect,
}: {
  node: ProjectNode
  recolhidos: ReadonlySet<string>
  onToggle: (id: string) => void
  selectedId: string | undefined
  onSelect: ((id: string) => void) | undefined
}) {
  const temFilhos = node.children.length > 0
  const aberto = temFilhos && !recolhidos.has(node.id)
  const ativo = selectedId === node.id

  /*
    Recolhido, o contador passa a somar a subárvore. Sem isso, esconder os filhos
    esconderia junto o trabalho pendente deles — a pasta pareceria vazia tendo doze
    tarefas dentro.
  */
  const contador = aberto ? node.openTaskCount : node.totalOpenTaskCount

  const conteudo = (
    <>
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-[3px]"
        style={{ backgroundColor: node.color }}
      />
      <span className="min-w-0 flex-1 truncate">{node.name}</span>
      {contador > 0 ? <span className="tabular text-ink-subtle text-xs">{contador}</span> : null}
    </>
  )

  const classes = cn(
    'flex flex-1 items-center gap-2 rounded-control py-1.5 pr-2 text-left text-sm',
    'transition-[colors,transform] duration-150 ease-press active:scale-[0.98]',
    ativo ? 'bg-surface-raised text-ink' : 'text-ink-muted hover:bg-surface hover:text-ink',
  )

  return (
    <li>
      <div className="group flex items-center" style={{ paddingLeft: node.depth * RECUO_PX }}>
        {/*
          A seta é botão à parte, e não parte da linha: recolher a pasta e abrir o
          projeto são ações diferentes, e juntá-las faria uma roubar o clique da outra.
          Quem não tem filhos ganha um espaço vazio do mesmo tamanho, para os nomes
          continuarem alinhados.
        */}
        {temFilhos ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-expanded={aberto}
            aria-label={`${aberto ? COPY.recolher : COPY.expandir}: ${node.name}`}
            className="shrink-0 rounded-[4px] p-0.5 text-ink-subtle transition-colors hover:text-ink"
          >
            <ChevronRight
              aria-hidden="true"
              className={cn(
                'size-3 transition-transform duration-150 ease-press',
                aberto && 'rotate-90',
              )}
            />
          </button>
        ) : (
          <span aria-hidden="true" className="size-4 shrink-0" />
        )}

        {onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            aria-pressed={ativo}
            className={classes}
          >
            {conteudo}
          </button>
        ) : (
          <Link
            to="/projects/$projectId"
            params={{ projectId: node.id }}
            aria-label={`${COPY.abrir}: ${node.name}`}
            className={classes}
          >
            {conteudo}
          </Link>
        )}

        {/*
          Some até o mouse chegar: com uma dúzia de projetos, um `+` fixo por linha
          vira uma coluna de ruído ao lado dos nomes.
        */}
        <span className="opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
          <NewProjectDialog parentId={node.id} />
        </span>
      </div>

      {aberto ? (
        <ul className="flex flex-col gap-0.5">
          {node.children.map((filho) => (
            <Node
              key={filho.id}
              node={filho}
              recolhidos={recolhidos}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
