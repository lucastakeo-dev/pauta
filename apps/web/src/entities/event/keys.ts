/**
 * Chaves de cache dos eventos. Ficam em `entities` porque tanto o planner quanto
 * qualquer tela futura precisam invalidar a MESMA entrada — chave duplicada em duas
 * features é cache que diverge sem ninguém perceber.
 */
export const eventKeys = {
  all: ['events'] as const,
  window: (from: string, to: string) => ['events', from, to] as const,
}
