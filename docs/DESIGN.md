# Pauta — sistema visual

Os tokens vivem em `apps/web/src/app/styles.css`, dentro do `@theme` do Tailwind v4. Este
documento explica **por que** cada um existe; o arquivo é a fonte da verdade dos valores.

## Princípios

**O dado é a interface.** A tela mais importante é uma grade de horas com blocos. Tudo que não for
o dado — bordas, fundos, rótulos — recua para que a grade seja legível num relance.

**Cor tem significado.** Um único acento (`iris`) para ação e foco. Fora dele, cor só aparece em
prioridade (`p1..p4`) e no marcador de "agora". Se tudo colore, nada chama atenção.

**Escuro por natureza, não por preferência.** O tema é escolha explícita na tag `<html>`, não
`prefers-color-scheme`: um planner usado o dia inteiro não deve mudar de cara ao anoitecer.

**Teclado em primeiro lugar.** `:focus-visible` tem estilo próprio e **nunca** é removido. Toda
ação alcançável pelo mouse precisa ser alcançável pelo teclado.

## Superfícies

Quatro degraus pequenos, do fundo para a frente: `canvas` → `surface` → `surface-raised` →
`surface-overlay`. Os passos são curtos de propósito: numa grade com dezenas de linhas, contraste
alto entre faixas vira listra e cansa.

Traços em dois pesos: `line` para separar, `line-strong` para delimitar o que é interativo.

## Texto

Três níveis, e só três: `ink` (o conteúdo), `ink-muted` (rótulos e apoio), `ink-subtle` (metadados
e estados vazios). Mais níveis que isso viram decisão sem critério.

Duas vozes: **Inter** para tudo que se lê, **JetBrains Mono** para tudo que se compara — horas,
durações, contadores. A classe `.tabular` fixa numerais tabulares para que números não "dancem"
ao atualizar.

## Prioridades

`p1` vermelho, `p2` âmbar, `p3` azul, `p4` cinza. A escala vai do urgente ao neutro, e `p4` é
propositalmente sem cor: a maioria das tarefas é P4, e colorir todas anularia o sinal.

## Espaçamento e forma

`--spacing-hour` (3.5rem) é a altura de uma hora na grade. É variável porque o zoom do dia (Fase 2)
muda esse valor e todo o resto precisa acompanhar sozinho.

`radius-card` para painéis, `radius-control` para botões e campos.

## Movimento

Transições curtas, só em cor e opacidade — nada que desloque conteúdo. O bloco
`prefers-reduced-motion` zera animações com `!important`, que aqui é necessário: sem ele qualquer
utilitário declarado depois vence a regra e a preferência da pessoa é ignorada.

## Estados obrigatórios

Todo componente nasce com: normal, hover, foco visível, desabilitado, carregando, erro e vazio.
O estado vazio é conteúdo, não sobra: diz o que fazer em seguida.

Erro de formulário é amarrado ao campo por `aria-describedby` + `aria-invalid`, e anunciado com
`role="alert"` — é o que faz o leitor de tela ler o erro junto do campo, e por isso mora no
componente `Field`, não em cada tela.

## Primitivos do shadcn

Componentes de comportamento complicado — diálogo, popover, menu — vêm do shadcn
(`npx shadcn@latest add <nome>`), que os deposita em `shared/ui/`. Eles entram por causa
do que é caro fazer à mão e fácil fazer errado: trava de foco, `aria-*` correto,
devolver o foco a quem abriu, fechar no Esc.

**Eles não trazem paleta.** O shadcn espera variáveis como `--color-background` e
`--color-border`. Em vez de aceitar as cores dele, o `@theme` do `styles.css` aponta
esses nomes para os nossos tokens:

```css
--color-background: var(--color-canvas);
--color-foreground: var(--color-ink);
--color-border: var(--color-line);
```

Assim o componente gerado fica igual ao resto do app sem ser editado — e continua
atualizável pelo CLI. O mesmo bloco é redefinido dentro de `.landing`, onde a superfície
é clara.

Quando um componente do shadcn pede uma variante que não temos (o diálogo pede
`outline` no botão), a variante nasce no **nosso** componente. Editar o arquivo gerado
é o último recurso.

## Movimento

Duas curvas em `@theme`, e nada além disso:

| Token | Onde | Por quê |
|---|---|---|
| `--ease-entrance` | diálogo, avisos, marca da caixa | algo que chega de fora precisa dizer de onde veio |
| `--ease-press` | botões, filtros, caixa de marcar | confirma que o clique registrou antes de o servidor responder |

Durações ficam entre 150ms e 200ms. Acima disso, um app que fica aberto o dia inteiro
começa a parecer lento — a animação passa a ser espera, não explicação.

Os utilitários `animate-in`, `fade-in-0` e `zoom-in-95` vêm do `tw-animate-css`. Ele é
dependência obrigatória, não enfeite: o shadcn gera componentes já usando essas classes,
então sem o pacote elas ficam no JSX sem efeito nenhum — foi exatamente o que aconteceu
com o primeiro diálogo, que abria sem transição.

Tudo isso é zerado por `prefers-reduced-motion: reduce`, no fim do `styles.css`.

## Retorno das ações

**Toda escrita responde num Toast** — criar, editar, excluir, concluir, agendar,
capturar — e não só as que falham. Se a pessoa mandou fazer algo, ela recebe a resposta
no mesmo lugar, sem procurar na tela o que mudou.

É isso que torna a escrita otimista honesta: a tela aplica o efeito antes da resposta
chegar, então sem confirmação "aplicado" e "salvo" ficariam indistinguíveis.

| Tom | Papel ARIA | Some em | Quando |
|---|---|---|---|
| Confirmação | `status` (polido) | 3,5s | a ação deu certo |
| Falha | `alert` (assertivo) | 6s | a ação falhou e foi desfeita |

São dois papéis porque a urgência difere: a confirmação espera a próxima pausa da
leitura; a falha corrige algo que a pessoa acabou de ver acontecer, e esperar chegaria
tarde. Nenhuma das duas leva `aria-label` — esses papéis não aceitam nome, e a mensagem
já é o conteúdo.

Mensagens iguais seguidas viram uma só com contador (`Tarefa concluída. ×3`). Sem isso,
a regra do "sempre Toast" tornaria a ação mais repetida do app numa pilha de avisos.

Duas exceções, ambas porque existe lugar melhor para a mensagem:

- **Erro de formulário** fica ao lado do campo. Nome de projeto repetido precisa apontar
  para o nome, não para o rodapé da tela.
- **Autosave da nota** tem indicador próprio no editor. Não é ação pedida, é consequência
  de digitar.

## Moldura: uma barra lateral, sem topo

As telas logadas têm só a barra à esquerda. Havia também uma faixa no topo com marca,
navegação e sair; ela custava uma linha inteira de altura para dizer o que a barra já
podia dizer — e num planner, onde a grade de horas quer altura, competia com o conteúdo.

O formato segue o [Linear](https://linear.app): identidade no topo (o nome é o botão do
menu da conta), captura rápida logo abaixo com o atalho à mostra, navegação, e por
último o trecho que muda conforme a tela.

**O trecho que muda vem da página, por portal.** A barra é do `app/`, mas seu conteúdo
de baixo é da tela — filtros de projeto em Hoje, lista de páginas em Notas — e a página
não pode importar de `app/`. Então ela renderiza o trecho onde ele nasce, junto do estado
que o alimenta, e o `SidebarSlot` o entrega dentro da barra. O portal preserva o contexto
do React, então nada precisa ser içado para a rota.

Seções são recolhíveis (`SidebarGroup`), porque projetos e etiquetas crescem sem limite:
quem tem vinte projetos não deveria rolar por eles para chegar nas etiquetas. O título
inteiro é o alvo do clique — a seta sozinha é pequena demais para mirar.

**Pendente:** a barra tem largura fixa e fica sempre visível. Abaixo de ~768px ela come
espaço demais, e como agora é a única navegação, não dá para simplesmente escondê-la.
A branch `fix/reachable-panels-on-small-screens` trata das telas pequenas.

## Projetos são uma árvore

Pasta é um projeto com filhos — não há entidade separada. A hierarquia aparece em três
lugares, e cada um faz uma coisa diferente com o clique:

| Onde | O clique no nome |
|---|---|
| Barra, em **Hoje** | filtra a lista ao lado |
| Barra, nas demais telas | abre a página do projeto |
| Índice `/projects` | abre a página do projeto |

A seta de recolher é botão à parte, nunca parte da linha: recolher a pasta e abrir o
projeto são ações diferentes, e juntá-las faria uma roubar o clique da outra. Quem não
tem filhos ganha um espaço vazio do mesmo tamanho, para os nomes seguirem alinhados.

**Recolhido, o contador passa a somar a subárvore.** Sem isso, esconder os filhos
esconderia junto o trabalho pendente deles — a pasta pareceria vazia tendo doze tarefas
dentro.

No modo filtro existe uma linha **"Todas"** acima da árvore. Ela não é enfeite: sem ela,
largar o filtro dependeria de descobrir que clicar de novo no projeto ativo o solta.

A página do projeto tem **Visão geral** e **Tarefas**. A visão geral responde "como está
isto" sem ler a lista inteira — quanto falta aqui, quanto falta abaixo, e em quais
subprojetos. Cabeçalho e conteúdo são alinhados à esquerda, não centralizados: sem uma
coluna à direita, centralizar deixaria a trilha e o título desalinhados do que vem abaixo.
