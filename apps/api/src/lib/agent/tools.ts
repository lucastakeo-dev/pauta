import type Anthropic from '@anthropic-ai/sdk'
import {
  createEventSchema,
  createProjectSchema,
  createTaskSchema,
  type ListTasksQuery,
  updateTaskSchema,
} from '@pauta/contracts'
import { z } from 'zod'
import * as eventModel from '../../models/event.model.js'
import * as projectModel from '../../models/project.model.js'
import * as taskModel from '../../models/task.model.js'

/**
 * As ferramentas do Agent.
 *
 * Elas chamam os **models**, nunca o Prisma: toda regra de negócio — nome de projeto
 * repetido, bloco que vaza do dia, ciclo na árvore — continua num lugar só, e o agente
 * erra do mesmo jeito que a interface erraria, com a mesma mensagem em pt-BR.
 *
 * O que não existe aqui é tão importante quanto o que existe: **nada apaga**. Um agente
 * que interpreta mal e cria uma tarefa a mais custa um clique; um que apaga o projeto
 * errado custa o histórico. Excluir continua sendo gesto humano, com confirmação.
 */

const idSchema = z.string().uuid()

/** O esquema de entrada de cada ferramenta, e o que fazer com ele. */
type Ferramenta = {
  descricao: string
  entrada: z.ZodType
  /** Devolve a linha que a pessoa lê no painel e o que volta para o modelo. */
  executar: (userId: string, input: unknown) => Promise<{ resumo: string; resultado: unknown }>
}

const listarTarefas = {
  descricao: [
    'Lista as tarefas da pessoa, com filtros. Use antes de alterar qualquer coisa:',
    'os ids vêm daqui. Sem filtro nenhum devolve o que está em aberto.',
  ].join(' '),
  entrada: z.object({
    status: z
      .array(z.enum(['inbox', 'todo', 'doing', 'done', 'canceled']))
      .optional()
      .describe('Filtra por situação. `inbox` é o que foi capturado e não processado.'),
    projectId: idSchema.optional(),
    search: z.string().optional().describe('Trecho do título.'),
    dueBefore: z
      .string()
      .optional()
      .describe('ISO 8601. Traz o que vence até esta data — use para "atrasadas" e "hoje".'),
    includeDone: z.boolean().optional(),
  }),
  executar: async (userId, input) => {
    const filtros = input as {
      status?: ListTasksQuery['status']
      projectId?: string
      search?: string
      dueBefore?: string
      includeDone?: boolean
    }

    /*
      A consulta é montada campo a campo, e não pelo schema da querystring: aquele
      espera `"true"`/`"false"` em texto, porque nasceu para ler uma URL. Aqui os
      valores já vêm tipados do schema da ferramenta.
    */
    const query: ListTasksQuery = {
      // `status` é sempre declarado, mesmo indefinido: o tipo da consulta o exige.
      status: filtros.status,
      ...(filtros.projectId ? { projectId: filtros.projectId } : {}),
      ...(filtros.search ? { search: filtros.search } : {}),
      ...(filtros.dueBefore ? { dueBefore: filtros.dueBefore } : {}),
      // Subtarefa também conta: o agente responde sobre tudo que existe, não sobre o
      // recorte que a lista da tela mostra.
      rootOnly: false,
      includeDone: filtros.includeDone ?? false,
      limit: 100,
    }

    const tarefas = await taskModel.list(userId, query)

    return {
      resumo: `Consultou ${tarefas.length} tarefa(s)`,
      resultado: tarefas.map((tarefa) => ({
        id: tarefa.id,
        title: tarefa.title,
        status: tarefa.status,
        priority: tarefa.priority,
        dueAt: tarefa.dueAt,
        scheduledStart: tarefa.scheduledStart,
        projectId: tarefa.projectId,
      })),
    }
  },
} satisfies Ferramenta

const criarTarefa = {
  descricao: [
    'Cria uma tarefa. Prazo (`dueAt`) é data sem hora; bloco na agenda é',
    '`scheduledStart` + `scheduledEnd`. Prioridade vai de 1 (urgente) a 4 (neutra).',
  ].join(' '),
  entrada: z.object({
    title: z.string().min(1),
    notes: z.string().optional(),
    projectId: idSchema.optional(),
    priority: z.number().int().min(1).max(4).optional(),
    dueAt: z.string().optional().describe('ISO 8601.'),
    scheduledStart: z.string().optional().describe('ISO 8601.'),
    scheduledEnd: z.string().optional().describe('ISO 8601. Obrigatório junto do início.'),
    status: z.enum(['inbox', 'todo']).optional().describe('Padrão: todo.'),
  }),
  executar: async (userId, input) => {
    const tarefa = await taskModel.create(
      userId,
      createTaskSchema.parse({ status: 'todo', ...(input as object) }),
    )

    return { resumo: `Criou a tarefa "${tarefa.title}"`, resultado: { id: tarefa.id } }
  },
} satisfies Ferramenta

const atualizarTarefa = {
  descricao: [
    'Altera uma tarefa existente. Mande só os campos que mudam.',
    'Para concluir, use `status: "done"`. Para tirar da inbox, `status: "todo"`.',
  ].join(' '),
  entrada: z.object({
    id: idSchema,
    title: z.string().optional(),
    notes: z.string().nullable().optional(),
    projectId: idSchema.nullable().optional(),
    priority: z.number().int().min(1).max(4).optional(),
    dueAt: z.string().nullable().optional(),
    scheduledStart: z.string().nullable().optional(),
    scheduledEnd: z.string().nullable().optional(),
    status: z.enum(['inbox', 'todo', 'doing', 'done', 'canceled']).optional(),
  }),
  executar: async (userId, input) => {
    const { id, ...campos } = input as { id: string } & Record<string, unknown>
    const tarefa = await taskModel.update(userId, id, updateTaskSchema.parse(campos))

    return { resumo: `Atualizou "${tarefa.title}"`, resultado: { id: tarefa.id } }
  },
} satisfies Ferramenta

const listarProjetos = {
  descricao: 'Lista os projetos, com id, nome e quantas tarefas em aberto cada um tem.',
  entrada: z.object({}),
  executar: async (userId) => {
    const projetos = await projectModel.list(userId)

    return {
      resumo: `Consultou ${projetos.length} projeto(s)`,
      resultado: projetos.map((projeto) => ({
        id: projeto.id,
        name: projeto.name,
        parentId: projeto.parentId,
        openTaskCount: projeto.openTaskCount,
      })),
    }
  },
} satisfies Ferramenta

const criarProjeto = {
  descricao: 'Cria um projeto. `parentId` o coloca dentro de outro.',
  entrada: z.object({
    name: z.string().min(1),
    parentId: idSchema.optional(),
  }),
  executar: async (userId, input) => {
    const projeto = await projectModel.create(userId, createProjectSchema.parse(input))

    return { resumo: `Criou o projeto "${projeto.name}"`, resultado: { id: projeto.id } }
  },
} satisfies Ferramenta

const criarCompromisso = {
  descricao: [
    'Cria um compromisso na agenda — reunião, call, almoço. Diferente de tarefa:',
    'tem hora marcada e não se conclui.',
  ].join(' '),
  entrada: z.object({
    title: z.string().min(1),
    startsAt: z.string().describe('ISO 8601.'),
    endsAt: z.string().describe('ISO 8601.'),
    location: z.string().optional(),
  }),
  executar: async (userId, input) => {
    const evento = await eventModel.create(
      userId,
      createEventSchema.parse({ allDay: false, ...(input as object) }),
    )

    return { resumo: `Criou o compromisso "${evento.title}"`, resultado: { id: evento.id } }
  },
} satisfies Ferramenta

const FERRAMENTAS: Record<string, Ferramenta> = {
  listar_tarefas: listarTarefas,
  criar_tarefa: criarTarefa,
  atualizar_tarefa: atualizarTarefa,
  listar_projetos: listarProjetos,
  criar_projeto: criarProjeto,
  criar_compromisso: criarCompromisso,
}

/** As definições que vão na requisição, geradas do mesmo schema que valida a entrada. */
export const agentTools: Anthropic.Tool[] = Object.entries(FERRAMENTAS).map(([name, tool]) => ({
  name,
  description: tool.descricao,
  input_schema: z.toJSONSchema(tool.entrada, { io: 'input' }) as Anthropic.Tool['input_schema'],
}))

export type AgentToolResult = { resumo: string; resultado: unknown; ok: boolean }

/**
 * Roda uma ferramenta.
 *
 * O erro não sobe: ele volta como resultado para o modelo, que assim pode corrigir o
 * pedido — id que não existe, nome de projeto repetido, bloco fora do dia. Derrubar o
 * turno faria a pessoa reescrever a frase inteira por causa de um id errado.
 */
export async function runAgentTool(
  userId: string,
  name: string,
  input: unknown,
): Promise<AgentToolResult> {
  const ferramenta = FERRAMENTAS[name]
  if (!ferramenta) {
    return {
      ok: false,
      resumo: `Ferramenta desconhecida: ${name}`,
      resultado: 'ferramenta inexistente',
    }
  }

  try {
    const { resumo, resultado } = await ferramenta.executar(userId, ferramenta.entrada.parse(input))
    return { ok: true, resumo, resultado }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Falhou.'
    return { ok: false, resumo: message, resultado: { erro: message } }
  }
}
