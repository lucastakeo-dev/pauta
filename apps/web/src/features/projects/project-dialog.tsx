import type { ProjectView } from '@pauta/contracts'
import { Plus } from 'lucide-react'
import { type FormEvent, type ReactNode, useId, useState } from 'react'
import { ApiRequestError } from '../../shared/api/client.js'
import { cn } from '../../shared/lib/cn.js'
import { Button } from '../../shared/ui/button.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../shared/ui/dialog.js'
import { IconButton } from '../../shared/ui/icon-button.js'
import { FALLBACK_ICON_KEY } from '../../shared/ui/icon-catalog.js'
import { IconPicker } from '../../shared/ui/icon-picker.js'
import { useCreateProject, useUpdateProject } from './queries.js'

const COPY = {
  novo: 'Novo projeto',
  novoDentro: 'Novo subprojeto',
  editar: 'Editar projeto',
  descricaoNovo: 'Projetos agrupam tarefas. Nome e ícone aparecem na barra lateral.',
  descricaoEdicao: 'Nome e ícone aparecem na barra lateral.',
  nome: 'Nome',
  placeholder: 'Casa, Trabalho, Estudos…',
  cor: 'Cor no planner',
  corAjuda: 'Pinta o bloco da tarefa na grade de horas.',
  criar: 'Criar',
  salvar: 'Salvar',
  cancelar: 'Cancelar',
  erroCriar: 'Não consegui criar o projeto.',
  erroSalvar: 'Não consegui salvar o projeto.',
}

/**
 * Paleta curta: cor de projeto é para distinguir de relance, não para expressar.
 * Cada uma leva nome porque o hexadecimal é o rótulo que o leitor de tela anunciaria —
 * "#4FB477" não diz nada a quem não vê a amostra.
 */
const CORES = [
  { valor: '#6E7BF2', nome: 'Azul' },
  { valor: '#4FB477', nome: 'Verde' },
  { valor: '#E8A33D', nome: 'Âmbar' },
  { valor: '#DE6C6C', nome: 'Vermelho' },
  { valor: '#9B6BD6', nome: 'Roxo' },
  { valor: '#4FA8C7', nome: 'Ciano' },
] as const

type Campos = { name: string; color: string; icon: string }

type NewProjectDialogProps = {
  /** Cria dentro deste projeto. Ausente cria na raiz. */
  parentId?: string | undefined
  /** Gatilho alternativo — a página de projetos usa um botão, a barra usa o `+`. */
  trigger?: ReactNode
}

/**
 * Criação de projeto num diálogo.
 *
 * Substituiu um campo que abria no lugar do botão `+`. Aquele formato tinha dois
 * problemas: fechava no `blur`, então clicar em qualquer lugar perdia o que foi
 * digitado, e não cabia mais nada além do nome — escolher cor era impossível.
 */
export function NewProjectDialog({ parentId, trigger }: NewProjectDialogProps) {
  const create = useCreateProject()
  const titulo = parentId ? COPY.novoDentro : COPY.novo

  return (
    <ProjectDialog
      titulo={titulo}
      descricao={COPY.descricaoNovo}
      confirmar={COPY.criar}
      erroPadrao={COPY.erroCriar}
      salvando={create.isPending}
      inicial={{ name: '', color: CORES[0].valor, icon: FALLBACK_ICON_KEY }}
      onSubmit={(campos) => create.mutateAsync({ ...campos, ...(parentId ? { parentId } : {}) })}
      trigger={
        trigger ?? (
          // Inline, e não um `BotaoMais` à parte: o `asChild` do Radix entrega os
          // handlers ao elemento filho, e um componente que não repassa props os
          // engole — o `+` abria coisa nenhuma.
          <IconButton aria-label={titulo} title={titulo}>
            <Plus aria-hidden="true" className="size-3.5" />
          </IconButton>
        )
      }
    />
  )
}

type EditProjectDialogProps = {
  project: ProjectView
  /** Sem gatilho padrão de propósito: cada tela abre a edição de um lugar diferente. */
  trigger?: ReactNode | undefined
  open?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
}

export function EditProjectDialog({
  project,
  trigger,
  open,
  onOpenChange,
}: EditProjectDialogProps) {
  const update = useUpdateProject()

  return (
    <ProjectDialog
      titulo={COPY.editar}
      descricao={COPY.descricaoEdicao}
      confirmar={COPY.salvar}
      erroPadrao={COPY.erroSalvar}
      salvando={update.isPending}
      inicial={{
        name: project.name,
        color: project.color,
        icon: project.icon ?? FALLBACK_ICON_KEY,
      }}
      onSubmit={(campos) => update.mutateAsync({ id: project.id, input: campos })}
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}

type ProjectDialogProps = {
  titulo: string
  descricao: string
  confirmar: string
  erroPadrao: string
  salvando: boolean
  inicial: Campos
  onSubmit: (campos: Campos) => Promise<unknown>
  /** Ausente quando quem abre é outro controle — um item de menu, por exemplo. */
  trigger?: ReactNode | undefined
  open?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
}

function ProjectDialog({
  titulo,
  descricao,
  confirmar,
  erroPadrao,
  salvando,
  inicial,
  onSubmit,
  trigger,
  open: openControlado,
  onOpenChange,
}: ProjectDialogProps) {
  const campoId = useId()
  const erroId = `${campoId}-erro`

  // Aberto por dentro quando há gatilho próprio; por fora quando quem abre é um item
  // de menu, que precisa se fechar antes de o diálogo aparecer.
  const [openInterno, setOpenInterno] = useState(false)
  const controlado = openControlado !== undefined
  const open = controlado ? openControlado : openInterno
  const setOpen = (proximo: boolean) => {
    if (controlado) onOpenChange?.(proximo)
    else setOpenInterno(proximo)
  }
  const [campos, setCampos] = useState<Campos>(inicial)
  const [error, setError] = useState<string | null>(null)

  function abrirOuFechar(proximo: boolean) {
    // Toda abertura parte do que está salvo. Sem isto, cancelar uma edição e reabrir
    // traria de volta o rascunho descartado como se fosse o estado do projeto.
    setCampos(inicial)
    setError(null)
    setOpen(proximo)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = campos.name.trim()
    if (!name) return

    setError(null)

    try {
      await onSubmit({ ...campos, name })
      setOpen(false)
    } catch (cause) {
      // Nome repetido volta 409 com mensagem própria; o diálogo fica aberto para
      // a pessoa corrigir sem perder o que digitou.
      setError(cause instanceof ApiRequestError ? cause.message : erroPadrao)
    }
  }

  return (
    <Dialog open={open} onOpenChange={abrirOuFechar}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      {/* A grade de ícones deixou o diálogo alto. Sem teto e sem rolagem, numa tela
          baixa o botão de salvar cairia para fora da janela, fora de alcance. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor={campoId} className="font-medium text-ink-muted text-sm">
              {COPY.nome}
            </label>

            <input
              id={campoId}
              // Sem `autoFocus`: o Radix já leva o foco para o primeiro campo ao abrir,
              // e devolve para o gatilho ao fechar.
              value={campos.name}
              onChange={(event) => setCampos({ ...campos, name: event.target.value })}
              placeholder={COPY.placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? erroId : undefined}
              className={cn(
                'h-10 rounded-control border bg-surface px-3 text-ink text-sm outline-none',
                'placeholder:text-ink-subtle transition-colors focus:border-iris',
                error ? 'border-danger' : 'border-line',
              )}
            />
          </div>

          <IconPicker value={campos.icon} onChange={(icon) => setCampos({ ...campos, icon })} />

          <fieldset className="flex flex-col gap-2">
            <legend className="font-medium text-ink-muted text-sm">{COPY.cor}</legend>
            {/* A cor saiu da barra lateral quando o ícone entrou. Dizer onde ela ainda
                aparece evita que a escolha pareça não ter efeito nenhum. */}
            <p className="pb-2 text-ink-subtle text-xs">{COPY.corAjuda}</p>

            <div className="flex flex-wrap gap-2">
              {/*
                O próprio input é o círculo (`appearance-none`), em vez de um radio
                escondido atrás de um `span`. Naquele formato o span cobria o input:
                o alvo do clique era um elemento e o controle era outro.
              */}
              {CORES.map((opcao) => (
                <input
                  key={opcao.valor}
                  type="radio"
                  name={`${campoId}-cor`}
                  value={opcao.valor}
                  aria-label={opcao.nome}
                  checked={campos.color === opcao.valor}
                  onChange={() => setCampos({ ...campos, color: opcao.valor })}
                  style={{ backgroundColor: opcao.valor }}
                  className={cn(
                    'size-7 cursor-pointer appearance-none rounded-full transition-all',
                    'focus-visible:outline-2 focus-visible:outline-iris focus-visible:outline-offset-2',
                    campos.color === opcao.valor
                      ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface'
                      : 'opacity-70 hover:opacity-100',
                  )}
                />
              ))}
            </div>
          </fieldset>

          {error ? (
            <p id={erroId} role="alert" className="text-danger text-sm">
              {error}
            </p>
          ) : null}

          <DialogFooter showCloseButton={false}>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {COPY.cancelar}
            </Button>
            <Button type="submit" loading={salvando} disabled={!campos.name.trim()}>
              {confirmar}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
