import { type FormEvent, useState } from 'react'
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
import { useCreateProject } from './queries.js'

const COPY = {
  abrir: 'Novo projeto',
  titulo: 'Novo projeto',
  descricao: 'Projetos agrupam tarefas. O nome aparece na barra lateral.',
  nome: 'Nome',
  placeholder: 'Casa, Trabalho, Estudos…',
  cor: 'Cor',
  criar: 'Criar',
  cancelar: 'Cancelar',
  erro: 'Não consegui criar o projeto.',
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

/**
 * Criação de projeto num diálogo.
 *
 * Substituiu um campo que abria no lugar do botão `+`. Aquele formato tinha dois
 * problemas: fechava no `blur`, então clicar em qualquer lugar perdia o que foi
 * digitado, e não cabia mais nada além do nome — escolher cor era impossível.
 */
export function NewProjectDialog() {
  const create = useCreateProject()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(CORES[0].valor)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setColor(CORES[0].valor)
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = name.trim()
    if (!trimmed) return

    setError(null)

    try {
      await create.mutateAsync({ name: trimmed, color })
      reset()
      setOpen(false)
    } catch (cause) {
      // Nome repetido volta 409 com mensagem própria; o diálogo fica aberto para
      // a pessoa corrigir sem perder o que digitou.
      setError(cause instanceof ApiRequestError ? cause.message : COPY.erro)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger
        aria-label={COPY.abrir}
        className={cn(
          'rounded-control px-1.5 text-ink-subtle text-sm leading-none',
          'transition-[colors,transform] duration-150 ease-press',
          'hover:text-ink active:scale-90',
        )}
      >
        +
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.titulo}</DialogTitle>
          <DialogDescription>{COPY.descricao}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="projeto-nome" className="font-medium text-ink-muted text-sm">
              {COPY.nome}
            </label>

            <input
              id="projeto-nome"
              // Sem `autoFocus`: o Radix já leva o foco para o primeiro campo ao abrir,
              // e devolve para o gatilho ao fechar.
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={COPY.placeholder}
              aria-invalid={error ? true : undefined}
              className={cn(
                'h-10 rounded-control border bg-surface px-3 text-ink text-sm outline-none',
                'placeholder:text-ink-subtle transition-colors focus:border-iris',
                error ? 'border-danger' : 'border-line',
              )}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="pb-2 font-medium text-ink-muted text-sm">{COPY.cor}</legend>

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
                  name="cor"
                  value={opcao.valor}
                  aria-label={opcao.nome}
                  checked={color === opcao.valor}
                  onChange={() => setColor(opcao.valor)}
                  style={{ backgroundColor: opcao.valor }}
                  className={cn(
                    'size-7 cursor-pointer appearance-none rounded-full transition-all',
                    'focus-visible:outline-2 focus-visible:outline-iris focus-visible:outline-offset-2',
                    color === opcao.valor
                      ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface'
                      : 'opacity-70 hover:opacity-100',
                  )}
                />
              ))}
            </div>
          </fieldset>

          {error ? (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          ) : null}

          <DialogFooter showCloseButton={false}>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {COPY.cancelar}
            </Button>
            <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
              {COPY.criar}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
