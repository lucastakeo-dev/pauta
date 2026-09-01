/** Chave de cache dos projetos, compartilhada por quem lê e por quem invalida. */
export const projectKeys = {
  all: ['projects'] as const,
  /** Lista à parte: o arquivo é outra pergunta, e quase ninguém a faz. */
  archived: ['projects', 'archived'] as const,
}
