import type { CommentView, TaskView } from '@pauta/contracts'
import { type FormEvent, type KeyboardEvent, useState } from 'react'
import {
  authorInitials,
  commentExactLabel,
  commentTimeLabel,
} from '../../entities/comment/index.js'
import { cn } from '../../shared/lib/cn.js'
import { Button } from '../../shared/ui/button.js'
import { useComments, useCreateComment, useDeleteComment, useUpdateComment } from './queries.js'

const COPY = {
  titulo: 'Comentários',
  placeholder: 'Escreva um comentário…',
  novo: 'Novo comentário',
  publicar: 'Comentar',
  atalho: '⌘↵',
  editar: 'Editar',
  editando: 'Editando o comentário',
  editado: 'editado',
  salvar: 'Salvar',
  cancelar: 'Cancelar',
  excluir: 'Excluir',
  excluirAjuda: 'Excluir comentário',
}

/**
 * A conversa em volta de uma tarefa.
 *
 * É o que a anotação não consegue ser. A anotação é o enunciado — reescrita à vontade,
 * e sempre no presente. O comentário é datado e se acumula: "cliente adiou", "faltou o
 * acesso", "voltou para revisão". Guardar os dois no mesmo campo faria cada atualização
 * apagar a anterior, e é justamente a sequência que se quer reler depois.
 */
export function TaskComments({ task }: { task: TaskView }) {
  const { data: comentarios, isPending } = useComments(task.id)
  const lista = comentarios ?? []

  return (
    // Nomeada porque é uma região de verdade: numa tarefa com histórico longo, poder
    // saltar direto para a conversa é o que evita percorrer os campos de novo a cada
    // visita. Sem o nome, a `section` nem chega a ser um marco para o leitor de tela.
    <section aria-label={COPY.titulo} className="flex flex-col gap-3 border-line border-t pt-4">
      <div className="flex items-center gap-3">
        <span className="font-medium text-[11px] text-ink-subtle">{COPY.titulo}</span>

        {lista.length > 0 ? (
          <span className="tabular text-[11px] text-ink-subtle">{lista.length}</span>
        ) : null}
      </div>

      {!isPending && lista.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {lista.map((comentario) => (
            <Comentario key={comentario.id} taskId={task.id} comentario={comentario} />
          ))}
        </ul>
      ) : null}

      <Composer taskId={task.id} />
    </section>
  )
}

function Comentario({ taskId, comentario }: { taskId: string; comentario: CommentView }) {
  const update = useUpdateComment(taskId)
  const remove = useDeleteComment(taskId)
  const [editando, setEditando] = useState(false)

  async function salvar(body: string) {
    await update.mutateAsync({ id: comentario.id, body })
    setEditando(false)
  }

  return (
    <li className="group flex gap-2.5">
      <Avatar nome={comentario.author.name} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-ink text-xs">{comentario.author.name}</span>

          <time
            dateTime={comentario.createdAt}
            title={commentExactLabel(comentario.createdAt)}
            className="shrink-0 text-[11px] text-ink-subtle"
          >
            {commentTimeLabel(comentario.createdAt)}
          </time>

          {comentario.editedAt ? (
            <span
              title={commentExactLabel(comentario.editedAt)}
              className="shrink-0 text-[11px] text-ink-subtle"
            >
              · {COPY.editado}
            </span>
          ) : null}

          {!editando ? (
            <div
              className={cn(
                'ml-auto flex shrink-0 items-center gap-1',
                'opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100',
              )}
            >
              <AcaoDiscreta onClick={() => setEditando(true)}>{COPY.editar}</AcaoDiscreta>

              <AcaoDiscreta
                perigo
                carregando={remove.isPending}
                onClick={() => remove.mutate(comentario.id)}
                aria-label={COPY.excluirAjuda}
              >
                {COPY.excluir}
              </AcaoDiscreta>
            </div>
          ) : null}
        </div>

        {editando ? (
          <CampoDeTexto
            inicial={comentario.body}
            rotulo={COPY.editando}
            confirmar={COPY.salvar}
            carregando={update.isPending}
            onCancel={() => setEditando(false)}
            onSubmit={salvar}
          />
        ) : (
          // `whitespace-pre-wrap`: quem escreve em linhas espera lê-las em linhas, e a
          // quebra é a única formatação que o corpo aceita.
          <p className="whitespace-pre-wrap break-words text-ink-muted text-[13px] leading-relaxed">
            {comentario.body}
          </p>
        )}
      </div>
    </li>
  )
}

function Composer({ taskId }: { taskId: string }) {
  const create = useCreateComment(taskId)

  return (
    <div className="flex gap-2.5">
      <CampoDeTexto
        inicial=""
        rotulo={COPY.novo}
        placeholder={COPY.placeholder}
        confirmar={COPY.publicar}
        carregando={create.isPending}
        limparAoEnviar
        onSubmit={(body) => create.mutateAsync(body)}
      />
    </div>
  )
}

/**
 * A caixa de escrever, usada para criar e para editar.
 *
 * Os dois casos são o mesmo gesto — escrever um texto e confirmar — e separá-los faria
 * o atalho, a validação e o crescimento da caixa existirem em duas versões que
 * divergiriam na primeira mudança.
 *
 * Os botões só aparecem quando há texto: enquanto a caixa está vazia, ela é uma linha
 * discreta no fim da conversa, e não um formulário pedindo para ser preenchido.
 */
function CampoDeTexto({
  inicial,
  rotulo,
  placeholder,
  confirmar,
  carregando,
  limparAoEnviar = false,
  onCancel,
  onSubmit,
}: {
  inicial: string
  rotulo: string
  placeholder?: string
  confirmar: string
  carregando: boolean
  limparAoEnviar?: boolean
  onCancel?: () => void
  onSubmit: (body: string) => Promise<unknown>
}) {
  const [texto, setTexto] = useState(inicial)

  const limpo = texto.trim()
  const mudou = limpo !== inicial.trim()
  const podeEnviar = limpo.length > 0 && (limparAoEnviar || mudou)

  async function enviar(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    if (!podeEnviar) return

    // Limpa antes da resposta: quem comenta costuma escrever em sequência, e esperar o
    // servidor entre um e outro quebra o ritmo.
    if (limparAoEnviar) setTexto('')

    await onSubmit(limpo)
  }

  function aoTeclar(event: KeyboardEvent<HTMLTextAreaElement>) {
    // ⌘/Ctrl+Enter publica sem tirar as mãos do teclado. Enter sozinho quebra linha —
    // um comentário costuma ter mais de uma.
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void enviar()
      return
    }

    if (event.key === 'Escape' && onCancel) {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <form onSubmit={enviar} className="flex min-w-0 flex-1 flex-col gap-2">
      <textarea
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
        onKeyDown={aoTeclar}
        placeholder={placeholder}
        aria-label={rotulo}
        rows={texto ? 3 : 1}
        className={cn(
          'w-full resize-none rounded-control border border-line bg-surface px-2.5 py-1.5',
          'text-ink text-[13px] leading-relaxed outline-none placeholder:text-ink-subtle',
          'transition-colors hover:border-line-strong focus:border-iris',
        )}
      />

      {texto ? (
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            loading={carregando}
            disabled={!podeEnviar}
            className="h-8 px-3 text-[13px]"
          >
            {confirmar}
          </Button>

          <span aria-hidden="true" className="text-[11px] text-ink-subtle">
            {COPY.atalho}
          </span>

          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="h-8 px-3 text-[13px]"
            >
              {COPY.cancelar}
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  )
}

/** Iniciais em vez de foto: não há upload de avatar, e um boneco genérico não diz quem é. */
function Avatar({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
        'bg-surface-raised font-medium text-[10px] text-ink-muted',
      )}
    >
      {authorInitials(nome)}
    </span>
  )
}

function AcaoDiscreta({
  children,
  onClick,
  perigo = false,
  carregando = false,
  ...props
}: {
  children: string
  onClick: () => void
  perigo?: boolean
  carregando?: boolean
  'aria-label'?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={carregando}
      className={cn(
        'rounded-[6px] px-1.5 py-0.5 text-[11px] transition-colors',
        'text-ink-subtle hover:bg-surface-raised',
        perigo ? 'hover:text-danger' : 'hover:text-ink',
        'focus-visible:opacity-100 disabled:opacity-50',
      )}
      {...props}
    >
      {children}
    </button>
  )
}
