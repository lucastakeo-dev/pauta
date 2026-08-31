/**
 * A régua da coluna da direita da barra.
 *
 * Projeto, etiqueta e tela do planner são listas diferentes, feitas por features que não
 * se conhecem, e todas caem na mesma coluna. Enquanto cada uma trazia a própria altura e
 * o próprio recuo, a coluna parecia três listas empilhadas em vez de uma. As classes
 * moram aqui porque é o único lugar que as três podem importar.
 */
export const sidebarRow =
  'flex h-8 items-center gap-2 rounded-[10px] px-2 text-left text-[13px] transition-colors duration-100'

/**
 * Pílula suave com traço. É de propósito mais fraca que a pílula sólida do destino no
 * trilho: estar em "Hoje" e ter "Casa" selecionado dentro dele são duas coisas ao mesmo
 * tempo, e com a mesma marca a segunda sumiria na primeira.
 */
export const sidebarRowActive = 'bg-surface-raised text-ink ring-1 ring-line'

export const sidebarRowIdle = 'text-ink-muted hover:bg-surface-raised/70 hover:text-ink'
