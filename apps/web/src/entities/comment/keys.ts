/**
 * Chaves de cache dos comentários, por tarefa.
 *
 * Cada tarefa tem a sua lista, então a chave carrega o id: invalidar a conversa de uma
 * não pode derrubar a das outras que estejam em cache.
 */
export const commentKeys = {
  all: ['comments'] as const,
  list: (taskId: string) => ['comments', taskId] as const,
}
