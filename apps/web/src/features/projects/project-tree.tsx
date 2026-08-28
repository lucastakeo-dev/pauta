import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { buildProjectTree, type ProjectNode } from '../../entities/project/index.js'
import { cn } from '../../shared/lib/cn.js'
import { usePersistentSet } from '../../shared/lib/persistent-set.js'
import { NewProjectDialog } from './new-project-dialog.js'
import { useProjects } from './queries.js'

const COPY = {
  todas: 'Todas',
  vazio: 'Nenhum projeto ainda.',
  expandir: 'Expandir',
  recolher: 'Recolher',
  abrir: 'Abrir projeto',
}

/** O que a pessoa recolheu. Guardado por navegador — é preferência, não dado. */
const CHAVE_RECOLHIDOS = 'pauta.projects.collapsed'

/*
  Uma classe só para as três formas que a linha assume — botão de filtro, link de
  navegação e o "Todas". Elas precisam ser indistinguíveis na tela; separar o estilo por
  elemento é como se chega em três linhas que quase combinam.
*/
const linhaBase = cn(
  'flex h-7 w-full min-w-0 items-center gap-1.5 rounded-[5px] pr-1.5 text-left text-[13px]',
  'transition-colors duration-100',
)
const linhaAtiva = 'bg-surface-raised font-medium text-ink'
const linhaInativa = 'text-ink-muted hover:bg-surface hover:text-ink'

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
  const [recolhidos, alternar] = usePersistentSet(CHAVE_RECOLHIDOS)

  const arvore = buildProjectTree(projects ?? [])

  if (projects && projects.length === 0) {
    return <p className="px-2 py-1.5 text-ink-subtle text-xs">{COPY.vazio}</p>
  }

  return (
    <ul className="flex flex-col">
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
            className={cn(linhaBase, 'pl-[26px]', selectedId ? linhaInativa : linhaAtiva)}
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
  onSelect: ((id: string | null) => void) | undefined
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
        className={cn('size-1.5 shrink-0 rounded-full transition-opacity', !ativo && 'opacity-70')}
        style={{ backgroundColor: node.color }}
      />
      <span className="min-w-0 flex-1 truncate">{node.name}</span>

      {contador > 0 ? (
        // Some no hover: o `+` ocupa esta mesma ponta, e os dois juntos empurrariam o
        // nome para fora numa linha estreita.
        <span className="tabular shrink-0 text-[11px] text-ink-subtle group-hover:invisible">
          {contador}
        </span>
      ) : null}
    </>
  )

  return (
    <li>
      <div className="group relative flex items-center">
        {/*
          Caixa de largura fixa para a seta. O espaçador de quem não tem filhos usa a
          mesma medida — é isso que mantém todos os nomes de um nível na mesma coluna.
          Antes o botão media diferente do espaçador, e cada linha começava num lugar.
        */}
        {temFilhos ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-expanded={aberto}
            aria-label={`${aberto ? COPY.recolher : COPY.expandir}: ${node.name}`}
            className="flex size-[18px] shrink-0 items-center justify-center rounded-[4px] text-ink-subtle transition-colors hover:bg-surface-raised hover:text-ink"
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
          <span aria-hidden="true" className="size-[18px] shrink-0" />
        )}

        {onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            aria-pressed={ativo}
            className={cn(linhaBase, ativo ? linhaAtiva : linhaInativa)}
          >
            {conteudo}
          </button>
        ) : (
          <Link
            to="/projects/$projectId"
            params={{ projectId: node.id }}
            aria-label={`${COPY.abrir}: ${node.name}`}
            className={cn(linhaBase, ativo ? linhaAtiva : linhaInativa)}
          >
            {conteudo}
          </Link>
        )}

        {/*
          Some até o mouse chegar: com uma dúzia de projetos, um `+` fixo por linha vira
          uma coluna de ruído ao lado dos nomes. Fica sobreposto à ponta da linha, e não
          ao lado dela, para aparecer sem reposicionar o nome.
        */}
        <span className="absolute right-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <NewProjectDialog parentId={node.id} />
        </span>
      </div>

      {aberto ? (
        /*
          O recuo vem do aninhamento, não de um cálculo por profundidade — e a borda
          desenha a linha-guia que liga os irmãos. É ela que faz a árvore ser lida como
          árvore: sem o traço, três níveis de recuo viram só texto deslocado.
        */
        <ul className="ml-[9px] flex flex-col border-line/70 border-l pl-[9px]">
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
