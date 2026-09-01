import { Link, useRouterState } from '@tanstack/react-router'
import {
  CalendarDays,
  FileText,
  FolderTree,
  Inbox,
  LogOut,
  Menu,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  Sun,
} from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useSession } from '../features/auth/session-context.js'
import { ConsoleOverlay } from '../features/console/console-overlay.js'
import { useConsoleShortcut } from '../features/console/use-console-shortcut.js'
import { ACCENTS, type Accent, accentSwatch, useAccent } from '../shared/lib/accent.js'
import { cn } from '../shared/lib/cn.js'
import { useIsDesktop } from '../shared/lib/media.js'
import { usePersistentFlag } from '../shared/lib/persistent.js'
import { type Theme, useTheme } from '../shared/lib/theme.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../shared/ui/dropdown-menu.js'
import { SidebarSlotProvider, SidebarSlotTarget } from '../shared/ui/sidebar-slot.js'

const COPY = {
  marca: 'Pauta',
  conta: 'Conta',
  sair: 'Sair',
  console: 'Captura rápida',
  atalho: '⌘K',
  barra: 'Barra lateral',
  secoes: 'Seções',
  recolher: 'Recolher o menu',
  expandir: 'Expandir o menu',
  abrirMenu: 'Abrir o menu',
  fecharMenu: 'Fechar o menu',
  temaClaro: 'Tema claro',
  temaEscuro: 'Tema escuro',
  cor: 'Cor principal',
}

/** Painel aberto ou recolhido. Preferência de quem olha, não dado de servidor. */
const CHAVE_MENU = 'pauta.menu.open'

const NAV = [
  // O inbox vem primeiro por ser onde a captura aterrissa: o que foi jogado ali sem
  // pensar é a primeira coisa a resolver no dia, antes de olhar a agenda.
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/today', label: 'Hoje', icon: CalendarDays },
  { to: '/projects', label: 'Projetos', icon: FolderTree },
  { to: '/notes', label: 'Notas', icon: FileText },
] as const

/**
 * Moldura das telas logadas: painéis flutuando sobre um fundo, em dois trilhos.
 *
 * O trilho estreito carrega marca, destinos e conta; o painel ao lado abre os mesmos
 * destinos com rótulo e, na coluna da direita, o que a tela atual quiser mostrar.
 *
 * A repetição dos destinos nos dois é de propósito, e é o que paga o trilho: recolhido
 * o painel, a navegação continua inteira em 52px. Antes a barra era a única navegação
 * do app e por isso não podia ser escondida — abaixo de ~768px ela comia a tela e não
 * havia o que fazer.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useSession()
  const quickCapture = useConsoleShortcut()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [aberto, alternarMenu] = usePersistentFlag(CHAVE_MENU, true)
  const [theme, setTheme] = useTheme()
  const [accent, setAccent] = useAccent()

  const desktop = useIsDesktop()
  const [gaveta, setGaveta] = useState(false)

  /*
    No estreito a barra é gaveta: some por padrão, cobre a tela quando chamada e some
    de novo assim que leva a algum lugar. Sem isto, escolher um projeto deixaria a
    gaveta aberta por cima da tela que ela acabou de abrir.
  */
  // biome-ignore lint/correctness/useExhaustiveDependencies: `pathname` é gatilho — mudou de tela, fecha.
  useEffect(() => setGaveta(false), [pathname])

  useEffect(() => {
    if (!gaveta) return

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setGaveta(false)
    }

    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [gaveta])

  // O painel recolhe no monitor; dentro da gaveta ele é a razão de ela existir.
  const mostraPainel = desktop ? aberto : true

  // `startsWith` e não igualdade: a página de um projeto também é "Projetos".
  const ehAtivo = (to: string) => pathname === to || pathname.startsWith(`${to}/`)

  // O cabeçalho do painel nomeia esta seção. Cair no primeiro item é o comportamento
  // certo para uma rota que ainda não existe: melhor um nome por um instante do que um
  // painel sem cabeçalho nenhum.
  const secao = NAV.find((item) => ehAtivo(item.to)) ?? NAV[0]

  return (
    <SidebarSlotProvider onChoice={() => setGaveta(false)}>
      <div className="flex h-dvh flex-col gap-1.5 overflow-hidden bg-shell p-1.5 md:flex-row">
        {/*
          A barra de cima só existe no estreito, e carrega o mínimo: o que abre a
          gaveta, onde se está, e a captura rápida — que no celular não tem ⌘K.
        */}
        <header className="flex h-11 shrink-0 items-center gap-1 rounded-card bg-surface pr-1.5 pl-1 md:hidden">
          <BotaoTrilho
            onClick={() => setGaveta(true)}
            aria-expanded={gaveta}
            rotulo={COPY.abrirMenu}
          >
            <Menu aria-hidden="true" className="size-[18px]" />
          </BotaoTrilho>

          <secao.icon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
          <h1 className="min-w-0 flex-1 truncate font-semibold text-ink text-sm">{secao.label}</h1>

          <BotaoTrilho onClick={() => quickCapture.setOpen(true)} rotulo={COPY.console}>
            <Search aria-hidden="true" className="size-[18px]" />
          </BotaoTrilho>
        </header>

        {/*
          O fundo é um botão de verdade, e não um `div` com clique: fechar a gaveta
          tocando fora precisa existir para o ponteiro e para quem lê a tela.
        */}
        {gaveta ? (
          <button
            type="button"
            aria-label={COPY.fecharMenu}
            onClick={() => setGaveta(false)}
            className="fixed inset-0 z-40 bg-shell/80 backdrop-blur-[1px] md:hidden"
          />
        ) : null}

        {/* Trilho e painel são dois retângulos na tela, mas uma região só para quem
            navega por marcos: separá-los daria dois "complementary" sem nome útil. */}
        <aside
          aria-label={COPY.barra}
          /*
            Fechada, a gaveta sai da ordem do Tab e da árvore de acessibilidade. Só
            escondê-la com `translate` deixaria a barra inteira alcançável por teclado
            atrás do conteúdo — invisível e focável é o pior dos dois mundos.
          */
          inert={!desktop && !gaveta}
          className={cn(
            'flex shrink-0 gap-1.5',
            'max-md:fixed max-md:inset-y-1.5 max-md:left-1.5 max-md:z-50',
            'max-md:transition-transform max-md:duration-200 max-md:ease-entrance',
            !gaveta && 'max-md:-translate-x-[calc(100%+0.75rem)]',
          )}
        >
          <div className="flex w-13 shrink-0 flex-col items-center gap-1 rounded-card bg-surface py-2.5">
            <Marca />

            <hr className="my-1.5 w-6 border-line border-t" />

            <nav aria-label={COPY.secoes} className="flex flex-col items-center gap-1">
              {NAV.map((item) => {
                const ativo = ehAtivo(item.to)
                const Icon = item.icon

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={ativo ? 'page' : undefined}
                    title={item.label}
                    className={cn(
                      'flex size-9 items-center justify-center rounded-[10px]',
                      'transition-colors duration-100',
                      ativo
                        ? 'bg-surface-raised text-ink'
                        : 'text-ink-subtle hover:bg-surface-raised hover:text-ink-muted',
                    )}
                  >
                    <Icon aria-hidden="true" className="size-[18px]" />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <span className="flex-1" />

            {/* Recolher mora no cabeçalho do painel, junto do que ele recolhe. Aqui
                fica só o inverso, e só quando não há painel para carregá-lo. */}
            {aberto ? null : (
              <BotaoTrilho onClick={alternarMenu} aria-expanded={false} rotulo={COPY.expandir}>
                <PanelLeftOpen aria-hidden="true" className="size-[18px]" />
              </BotaoTrilho>
            )}

            <BotaoTrilho
              onClick={() => quickCapture.setOpen(true)}
              rotulo={`${COPY.console} (${COPY.atalho})`}
            >
              <Search aria-hidden="true" className="size-[18px]" />
            </BotaoTrilho>

            <ContaMenu
              name={user?.name ?? COPY.marca}
              theme={theme}
              onTheme={setTheme}
              accent={accent}
              onAccent={setAccent}
              onSignOut={signOut}
            />
          </div>

          {mostraPainel ? (
            <div className="flex w-[272px] shrink-0 flex-col overflow-hidden rounded-card bg-surface">
              {/*
                O cabeçalho nomeia a seção em que se está — não repete a marca nem os
                destinos. O trilho troca de seção; o painel mostra o que há dentro dela.
                Enquanto ele espelhava o trilho, clicar no calendário levava às mesmas
                três opções de novo, e a coluna inteira não dizia nada sobre o calendário.
              */}
              <header className="flex h-11 shrink-0 items-center gap-2 border-line border-b pr-2 pl-3">
                <secao.icon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
                <h2 className="min-w-0 flex-1 truncate font-semibold text-ink text-sm">
                  {secao.label}
                </h2>

                {/* Recolher é do monitor: dentro da gaveta, o painel é justamente o
                    que se veio ver, e quem fecha é o fundo, o Esc ou navegar. */}
                <button
                  type="button"
                  onClick={alternarMenu}
                  aria-expanded={true}
                  aria-label={COPY.recolher}
                  title={COPY.recolher}
                  className={cn(
                    'hidden size-7 shrink-0 items-center justify-center rounded-[8px] md:flex',
                    'text-ink-subtle transition-colors hover:bg-surface-raised hover:text-ink',
                  )}
                >
                  <PanelLeftClose aria-hidden="true" className="size-4" />
                </button>
              </header>

              {/* O que a seção atual quer na barra. Vazio é um estado normal. */}
              <SidebarSlotTarget
                className={cn(
                  'flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-2',
                  // O traço entre seções mora aqui e não dentro do grupo: elas chegam
                  // pelo portal com pais diferentes, então nenhuma sabe sozinha se é a
                  // primeira da coluna.
                  'divide-y divide-line',
                )}
              />
            </div>
          ) : null}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-card bg-canvas">
          {children}
        </div>

        {quickCapture.open ? <ConsoleOverlay onClose={() => quickCapture.setOpen(false)} /> : null}
      </div>
    </SidebarSlotProvider>
  )
}

/**
 * A marca, sem fundo colorido.
 *
 * O acento tem um trabalho só neste app — ação e foco. Com o trilho colorindo também a
 * marca e o avatar, sobrariam três manchas iris numa coluna de 52px e nenhuma delas
 * chamaria atenção. O avatar fica com a cor porque identidade é a única das três que
 * precisa ser encontrada de relance.
 */
function Marca() {
  return (
    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center text-ink">
      <Sparkles className="size-[19px]" />
    </span>
  )
}

/** Os botões do trilho: mesma medida e mesma forma dos destinos logo acima. */
function BotaoTrilho({
  rotulo,
  children,
  ...props
}: { rotulo: string } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-[10px] text-ink-subtle',
        'transition-colors duration-100 hover:bg-surface-raised hover:text-ink',
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * Identidade e saída no pé do trilho.
 *
 * Sair mora dentro do menu em vez de solto na barra porque é ação rara e destrutiva o
 * bastante para não merecer ficar a um clique de distância o tempo todo.
 */
function ContaMenu({
  name,
  theme,
  onTheme,
  accent,
  onAccent,
  onSignOut,
}: {
  name: string
  theme: Theme
  onTheme: (theme: Theme) => void
  accent: string
  onAccent: (accent: string) => void
  onSignOut: () => void
}) {
  const inicial = name.trim().slice(0, 2).toUpperCase()
  const claro = theme === 'light'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={COPY.conta}
        title={name}
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-iris',
          'font-medium text-[11px] text-canvas transition-opacity hover:opacity-90',
        )}
      >
        <span aria-hidden="true">{inicial}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" align="end" className="w-52">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Um item só, nomeando o destino e não o estado: "Tema claro" leva ao claro.
            Dois rádios custariam uma linha a mais para dizer o mesmo em dois cliques. */}
        <DropdownMenuItem onSelect={() => onTheme(claro ? 'dark' : 'light')}>
          {claro ? (
            <Moon aria-hidden="true" className="size-4" />
          ) : (
            <Sun aria-hidden="true" className="size-4" />
          )}
          {claro ? COPY.temaEscuro : COPY.temaClaro}
        </DropdownMenuItem>

        {/*
          A cor principal fica junto do tema porque as duas respondem à mesma pergunta:
          com que cara o app abre. E fica num submenu porque oito amostras numa lista de
          quatro itens seriam a maior parte do menu.
        */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette aria-hidden="true" className="size-4" />
            {COPY.cor}
            {/* A amostra usa o próprio token do acento: seja qual for a escolha, o
                ponto no menu é exatamente a cor que o app está usando. */}
            <span aria-hidden="true" className="ml-auto size-3 rounded-full bg-iris" />
          </DropdownMenuSubTrigger>

          <DropdownMenuSubContent className="grid grid-cols-4 gap-1 p-1.5">
            {ACCENTS.map((opcao) => (
              <Amostra
                key={opcao.key}
                accent={opcao}
                ativa={opcao.key === accent}
                onSelect={() => onAccent(opcao.key)}
              />
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut aria-hidden="true" className="size-4" />
          {COPY.sair}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Uma cor da paleta.
 *
 * A escolhida ganha o mesmo anel que as cores do diálogo de projeto — o app já tem uma
 * língua para "esta é a cor selecionada", e um risco branco dentro do círculo sumiria
 * justamente nas amostras claras.
 */
function Amostra({
  accent,
  ativa,
  onSelect,
}: {
  accent: Accent
  ativa: boolean
  onSelect: () => void
}) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      aria-label={accent.label}
      title={accent.label}
      className="flex size-8 items-center justify-center rounded-full p-0 focus:bg-transparent"
    >
      <span
        aria-hidden="true"
        style={{ backgroundColor: accentSwatch(accent) }}
        className={cn(
          'size-5 rounded-full transition-all',
          ativa
            ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface-overlay'
            : 'opacity-80 hover:opacity-100',
        )}
      />
    </DropdownMenuItem>
  )
}
