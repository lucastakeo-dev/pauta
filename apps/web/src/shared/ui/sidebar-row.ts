/**
 * A régua da coluna da direita da barra.
 *
 * Projeto, etiqueta e tela do planner são listas diferentes, feitas por features que não
 * se conhecem, e todas caem na mesma coluna. Enquanto cada uma trazia a própria altura e
 * o próprio recuo, a coluna parecia três listas empilhadas em vez de uma. As classes
 * moram aqui porque é o único lugar que as três podem importar.
 */
export const sidebarRow =
  'relative flex h-8 items-center gap-2 rounded-[10px] px-2 text-left text-[13px] transition-colors duration-100'

/**
 * Selecionado: fundo tinto e uma barra de acento colada na borda esquerda.
 *
 * Antes era fundo mais um anel de 1px em volta. O anel dizia "isto é uma caixa", não
 * "isto é o item em que você está" — e, numa lista de linhas encostadas, virava mais
 * um traço entre tantos. A barra aponta para uma linha só, na margem por onde o olho
 * desce a lista.
 *
 * É de propósito mais fraca que o chip do destino no trilho: estar em "Hoje" e ter
 * "Casa" selecionado dentro dele são duas coisas ao mesmo tempo, e com a mesma marca
 * a segunda sumiria na primeira.
 */
export const sidebarRowActive = [
  'bg-surface-raised font-medium text-ink',
  'before:absolute before:inset-y-1.5 before:left-0 before:w-[3px]',
  'before:rounded-r-full before:bg-iris before:content-[""]',
].join(' ')

/**
 * No caminho do selecionado: só o peso do texto.
 *
 * Uma pasta que contém o item aberto não está selecionada — mas some da vista se ficar
 * igual às vizinhas, e aí a hierarquia deixa de dizer onde se está.
 */
export const sidebarRowOnPath = 'font-medium text-ink hover:bg-surface-raised/70'

export const sidebarRowIdle = 'text-ink-muted hover:bg-surface-raised/70 hover:text-ink'
