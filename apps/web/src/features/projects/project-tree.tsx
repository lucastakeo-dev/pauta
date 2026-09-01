import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Link } from '@tanstack/react-router'
import { ChevronDown, Layers } from 'lucide-react'
import {
  buildProjectTree,
  containsProject,
  type ProjectNode,
} from '../../entities/project/index.js'
import { cn } from '../../shared/lib/cn.js'
import { usePersistentSet } from '../../shared/lib/persistent.js'
import { NamedIcon } from '../../shared/ui/icon-catalog.js'
import { sidebarRow, sidebarRowActive, sidebarRowOnPath } from '../../shared/ui/sidebar-row.js'
import { useSidebarChoice } from '../../shared/ui/sidebar-slot.js'
import { NewProjectDialog } from './project-dialog.js'
import { ProjectDndProvider, useDropIndicator } from './project-dnd.js'
import { ProjectMenu } from './project-menu.js'
import { useProjects } from './queries.js'

const COPY = {
  todas: 'Todas',
  vazio: 'Nenhum projeto ainda.',
  expandir: 'Expandir',
  recolher: 'Recolher',
  abrir: 'Abrir projeto',
  emAberto: 'em aberto',
  mover: 'Mover projeto',
}

/** O que a pessoa recolheu. Guardado por navegador — é preferência, não dado. */
const CHAVE_RECOLHIDOS = 'pauta.projects.collapsed'

/*
  A moldura da linha — altura, cantos e fundo — mora no contêiner, não no link.
  Precisa ser assim: a seta de recolher é um botão irmão do link, e um botão dentro de
  um link é HTML inválido. Com o fundo no contêiner, os dois convivem e a linha inteira
  continua acendendo junta.
*/
/*
  A linha usa a régua da coluna, mas com `gap-1`: aqui o rótulo é um filho separado, e
  o espaço entre ícone e nome vem dele, não do contêiner.
*/
const linha = cn(sidebarRow, 'gap-1')
const linhaAtiva = sidebarRowActive
const linhaInativa = 'hover:bg-surface-raised/70'

const rotulo = 'flex min-w-0 items-center gap-2 text-left text-[13px] transition-colors'
const rotuloAtivo = 'font-medium text-ink'
const rotuloNoCaminho = sidebarRowOnPath
const rotuloInativo = 'text-ink-muted group-hover:text-ink'

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

export function ProjectTree({ selectedId, onSelect: aoEscolher }: ProjectTreeProps) {
  const { data: projects } = useProjects()
  const escolheu = useSidebarChoice()

  /*
    Filtrar por projeto acontece sem sair da rota, então na tela estreita a gaveta não
    fecharia sozinha — ficaria por cima da lista que acabou de ser filtrada. No modo
    navegação isso não é preciso: mudar de URL já fecha.
  */
  const onSelect = aoEscolher
    ? (id: string | null) => {
        aoEscolher(id)
        escolheu()
      }
    : undefined
  const [recolhidos, alternar] = usePersistentSet(CHAVE_RECOLHIDOS)

  const arvore = buildProjectTree(projects ?? [])

  if (projects && projects.length === 0) {
    return <p className="px-2 py-1.5 text-ink-subtle text-xs">{COPY.vazio}</p>
  }

  return (
    <ProjectDndProvider roots={arvore}>
      <ul className="flex flex-col">
        {/*
        Só no modo filtro. Sem esta linha, largar o filtro dependeria de descobrir que
        clicar de novo no projeto ativo o solta — e ninguém descobre isso sozinho.
        No modo navegação ela não faria sentido: o índice já é a visão de tudo.
      */}
        {onSelect ? (
          <li className={cn('group', linha, selectedId ? linhaInativa : linhaAtiva)}>
            <button
              type="button"
              onClick={() => onSelect(null)}
              aria-pressed={!selectedId}
              className={cn(rotulo, 'flex-1', selectedId ? rotuloInativo : rotuloAtivo)}
            >
              {/* Também com ícone, ainda que "Todas" não seja um projeto: sem ele o rótulo
                começaria 24px à esquerda de todos os outros e a coluna quebraria logo
                na primeira linha. */}
              <Layers aria-hidden="true" className="size-4 shrink-0" />
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
    </ProjectDndProvider>
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
    A linha é alvo de soltura e o rótulo é a alça. Separados porque são coisas
    diferentes: solta-se na linha inteira, mas pegar tem de ser no nome — a seta de
    recolher e os botões da ponta precisam continuar respondendo ao clique.
  */
  const { setNodeRef: soltarRef } = useDroppable({ id: node.id })
  const { listeners, setNodeRef: arrastarRef, isDragging } = useDraggable({ id: node.id })

  const indicador = useDropIndicator()
  const mira = indicador?.overId === node.id ? indicador.zone : null

  /*
    Só os `listeners` do dnd-kit, sem os `attributes`: eles trazem `role="button"`, e o
    nome do projeto é um link de verdade — trocar o papel dele tiraria da navegação por
    leitor de tela a lista de destinos que a barra é. O caminho de teclado para mover
    está em "Mover para", no menu da linha.
  */
  const alca = { ...listeners, ref: arrastarRef, draggable: false }

  // Pasta que contém o selecionado: ganha o peso do texto, não a barra. A barra aponta
  // uma linha só — se subisse pela árvore, três linhas diriam "é aqui" ao mesmo tempo.
  const noCaminho = !ativo && containsProject(node, selectedId)
  const aparencia = ativo ? rotuloAtivo : noCaminho ? rotuloNoCaminho : rotuloInativo

  /*
    Recolhido, o contador passa a somar a subárvore. Sem isso, esconder os filhos
    esconderia junto o trabalho pendente deles — a pasta pareceria vazia tendo doze
    tarefas dentro.
  */
  const contador = aberto ? node.openTaskCount : node.totalOpenTaskCount

  /*
    O número é do projeto, mas na tela ele fica na ponta da linha, fora do link — a
    seta de recolher precisa ser irmã do link, não filha. Então ele entra no rótulo:
    sem isto, o leitor de tela anuncia "Trabalho" e, adiante, um "5" sem dono.
  */
  const descricao = contador > 0 ? `${node.name}, ${contador} ${COPY.emAberto}` : node.name

  /*
    O ícone herda a cor da linha, sem tratamento próprio: assim o par ícone + nome acende
    junto no hover e no ativo, e lê como uma coisa só. Ele substituiu a bolinha colorida
    — seis cores numa coluna de 232px eram ruído, e a forma distingue melhor que o matiz.
    A cor do projeto continua existindo; ela pinta o bloco no planner.
  */
  const nome = (
    <>
      <NamedIcon name={node.icon} className="size-4 shrink-0" />
      <span className="truncate">{node.name}</span>
    </>
  )

  return (
    <li>
      <div
        ref={soltarRef}
        className={cn(
          'group relative',
          linha,
          ativo ? linhaAtiva : linhaInativa,
          isDragging && 'opacity-40',
          // Aninhar é a única soltura sem traço: o alvo é a linha inteira, então ela
          // mesma se acende.
          mira === 'inside' && 'bg-iris/15 ring-1 ring-iris ring-inset',
        )}
      >
        {/* O traço mostra onde a linha vai encostar. Fica fora do fluxo para não
            empurrar nada enquanto o ponteiro passeia. */}
        {mira === 'before' || mira === 'after' ? (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute right-0 left-0 z-10 h-0.5 rounded-full bg-iris',
              mira === 'before' ? '-top-px' : '-bottom-px',
            )}
          />
        ) : null}
        {onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            aria-pressed={ativo}
            aria-label={descricao}
            title={`${COPY.mover}: ${node.name}`}
            className={cn(rotulo, aparencia, 'cursor-grab active:cursor-grabbing')}
            {...alca}
          >
            {nome}
          </button>
        ) : (
          <Link
            to="/projects/$projectId"
            params={{ projectId: node.id }}
            aria-label={`${COPY.abrir}: ${descricao}`}
            title={`${COPY.mover}: ${node.name}`}
            className={cn(rotulo, aparencia, 'cursor-grab active:cursor-grabbing')}
            {...alca}
          >
            {nome}
          </Link>
        )}

        {/* Depois do nome, como no "work ⌄" da referência — e não numa coluna própria
            antes dele, que obrigava toda linha sem filhos a carregar um vão vazio. */}
        {temFilhos ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-expanded={aberto}
            aria-label={`${aberto ? COPY.recolher : COPY.expandir}: ${node.name}`}
            className="shrink-0 rounded-[3px] p-0.5 text-ink-subtle transition-colors hover:text-ink"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-3 transition-transform duration-150 ease-press',
                !aberto && '-rotate-90',
              )}
            />
          </button>
        ) : null}

        <span className="flex-1" />

        {contador > 0 ? (
          // Some no hover: o `+` ocupa esta mesma ponta, e os dois juntos empurrariam o
          // nome para fora numa barra estreita.
          <span
            // Já anunciado no rótulo do link; repetir aqui faria o leitor dizer duas vezes.
            aria-hidden="true"
            className="tabular shrink-0 text-[11px] text-ink-subtle group-hover:invisible"
          >
            {contador}
          </span>
        ) : null}

        {/*
          Somem até o mouse chegar: com uma dúzia de projetos, dois botões fixos por linha
          viram uma coluna de ruído ao lado dos nomes. Continuam alcançáveis pelo teclado —
          o `focus-within` os revela quando o Tab chega neles.
        */}
        <span className="absolute right-1 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <ProjectMenu project={node} />

          <NewProjectDialog parentId={node.id} />
        </span>
      </div>

      {aberto ? (
        /*
          Recuo com traço ligando os irmãos. Ele tinha saído por não existir na
          referência anterior; a nova o tem, e com ele a subárvore lê como um bloco em
          vez de linhas soltas mais à direita.

          `ml-4` põe o traço exatamente no centro do ícone do pai — 8px de padding mais
          metade de um ícone de 16. Alinhar por olho deixava um degrau visível a cada
          nível.
        */
        <ul className="ml-4 flex flex-col border-line border-l pl-1">
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
