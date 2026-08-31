import {
  Bike,
  Blocks,
  BookOpen,
  Box,
  Brain,
  Briefcase,
  Brush,
  Bug,
  Building2,
  Calendar,
  Camera,
  ChartColumn,
  Code,
  Coffee,
  Cpu,
  Database,
  Dumbbell,
  Feather,
  Film,
  Flag,
  GitBranch,
  GraduationCap,
  Handshake,
  Hash,
  Heart,
  House,
  Inbox,
  Languages,
  Library,
  Lightbulb,
  type LucideIcon,
  Microscope,
  Music,
  Palette,
  Pencil,
  PenLine,
  PiggyBank,
  Plane,
  Presentation,
  Rocket,
  Server,
  Shapes,
  ShoppingCart,
  Sparkles,
  Star,
  Target,
  Terminal,
  Utensils,
  Wallet,
} from 'lucide-react'

export type IconOption = {
  /** O que vai para o banco: o nome do lucide em kebab-case, legível numa consulta SQL. */
  key: string
  /** Nome em pt-BR. É o que o leitor de tela anuncia ao percorrer a grade do seletor. */
  label: string
  Icon: LucideIcon
}

/** Projeto sem ícone — e projeto com ícone que não existe mais, que na tela é o mesmo caso. */
const PADRAO: IconOption = { key: 'hash', label: 'Hashtag', Icon: Hash }

/**
 * Catálogo curado.
 *
 * A ordem não é decorativa: a grade tem oito colunas, então cada linha da tela é um tema
 * — geral, trabalho, estudo, código, criação, vida. Agrupa sem gastar altura com título
 * de grupo, que em 48 ícones custaria mais do que ajuda a achar.
 */
export const ICON_OPTIONS: IconOption[] = [
  PADRAO,
  { key: 'star', label: 'Estrela', Icon: Star },
  { key: 'flag', label: 'Bandeira', Icon: Flag },
  { key: 'target', label: 'Alvo', Icon: Target },
  { key: 'calendar', label: 'Calendário', Icon: Calendar },
  { key: 'inbox', label: 'Caixa de entrada', Icon: Inbox },
  { key: 'sparkles', label: 'Brilho', Icon: Sparkles },
  { key: 'blocks', label: 'Blocos', Icon: Blocks },

  { key: 'briefcase', label: 'Maleta', Icon: Briefcase },
  { key: 'building-2', label: 'Prédio', Icon: Building2 },
  { key: 'handshake', label: 'Aperto de mão', Icon: Handshake },
  { key: 'presentation', label: 'Apresentação', Icon: Presentation },
  { key: 'chart-column', label: 'Gráfico', Icon: ChartColumn },
  { key: 'rocket', label: 'Foguete', Icon: Rocket },
  { key: 'wallet', label: 'Carteira', Icon: Wallet },
  { key: 'piggy-bank', label: 'Cofrinho', Icon: PiggyBank },

  { key: 'graduation-cap', label: 'Formatura', Icon: GraduationCap },
  { key: 'book-open', label: 'Livro', Icon: BookOpen },
  { key: 'library', label: 'Biblioteca', Icon: Library },
  { key: 'lightbulb', label: 'Lâmpada', Icon: Lightbulb },
  { key: 'brain', label: 'Cérebro', Icon: Brain },
  { key: 'pen-line', label: 'Caneta', Icon: PenLine },
  { key: 'languages', label: 'Idiomas', Icon: Languages },
  { key: 'microscope', label: 'Microscópio', Icon: Microscope },

  { key: 'code', label: 'Código', Icon: Code },
  { key: 'terminal', label: 'Terminal', Icon: Terminal },
  { key: 'database', label: 'Banco de dados', Icon: Database },
  { key: 'server', label: 'Servidor', Icon: Server },
  { key: 'bug', label: 'Bug', Icon: Bug },
  { key: 'git-branch', label: 'Branch', Icon: GitBranch },
  { key: 'cpu', label: 'Processador', Icon: Cpu },
  { key: 'box', label: 'Caixa', Icon: Box },

  { key: 'palette', label: 'Paleta', Icon: Palette },
  { key: 'brush', label: 'Pincel', Icon: Brush },
  { key: 'camera', label: 'Câmera', Icon: Camera },
  { key: 'music', label: 'Música', Icon: Music },
  { key: 'film', label: 'Filme', Icon: Film },
  { key: 'feather', label: 'Pena', Icon: Feather },
  { key: 'shapes', label: 'Formas', Icon: Shapes },
  { key: 'pencil', label: 'Lápis', Icon: Pencil },

  { key: 'house', label: 'Casa', Icon: House },
  { key: 'heart', label: 'Coração', Icon: Heart },
  { key: 'dumbbell', label: 'Halter', Icon: Dumbbell },
  { key: 'bike', label: 'Bicicleta', Icon: Bike },
  { key: 'plane', label: 'Avião', Icon: Plane },
  { key: 'coffee', label: 'Café', Icon: Coffee },
  { key: 'utensils', label: 'Talheres', Icon: Utensils },
  { key: 'shopping-cart', label: 'Carrinho', Icon: ShoppingCart },
]

export const FALLBACK_ICON_KEY = PADRAO.key

const POR_CHAVE = new Map(ICON_OPTIONS.map((opcao) => [opcao.key, opcao]))

/** Nunca falha: chave ausente ou desconhecida cai no padrão, e a linha continua alinhada. */
export function resolveIcon(key: string | null | undefined): IconOption {
  return (key ? POR_CHAVE.get(key) : undefined) ?? PADRAO
}

/**
 * O ícone de um projeto, onde quer que ele apareça.
 *
 * É sempre decorativo: o nome vem do lado, e anunciar os dois faria o leitor de tela
 * dizer "Casa, Casa". Quem precisa do nome do ícone é o seletor, e lá ele é o rótulo
 * do próprio controle.
 */
export function NamedIcon({ name, className }: { name: string | null; className?: string }) {
  const { Icon } = resolveIcon(name)

  return <Icon aria-hidden="true" className={className} />
}
