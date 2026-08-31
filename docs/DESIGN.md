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

Cinco degraus pequenos, do fundo para a frente: `shell` → `canvas` → `surface` →
`surface-raised` → `surface-overlay`. O primeiro entrou com a moldura de painéis
flutuantes e não recebe conteúdo nenhum: é só o vão entre o trilho, o menu e a tela. Os passos são curtos de propósito: numa grade com dezenas de linhas, contraste
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

## Moldura: trilho, painel e tela

As telas logadas são três retângulos flutuando sobre um fundo (`shell`, o único degrau
mais escuro que o `canvas` — ele existe só para os painéis terem de onde se destacar):

| Peça | Largura | O que carrega |
|---|---|---|
| **Trilho** | 52px | marca, os três destinos como ícone, recolher, captura e conta |
| **Painel** | 336px | coluna do menu (132px) e coluna do que a tela atual quiser |
| **Tela** | o resto | o conteúdo da página |

Antes disso houve uma faixa no topo, com marca, navegação e sair; ela custava uma linha
inteira de altura para dizer o que a barra já podia dizer. Depois houve uma barra só, de
232px. O formato atual segue a referência de duas colunas e resolve o que a barra única
não resolvia.

**Os destinos aparecem duas vezes, e é isso que paga o trilho.** Recolhido o painel, a
navegação continua inteira em 52px. Enquanto a barra era a única navegação do app, ela
não podia ser escondida — abaixo de ~768px comia a tela e não havia o que fazer. Agora
há: o botão de recolher, e o que foi recolhido continua assim entre telas e recargas.

Para quem navega por marcos, trilho e painel são **uma região só** (`aside` com nome).
Separá-los daria dois `complementary` sem nome útil. As duas listas de destino são dois
`nav` com rótulos diferentes — "Seções" no painel, "Atalhos das seções" no trilho — que
é o que permite ao leitor de tela dizer qual é qual.

**A coluna da direita vem da página, por portal.** O painel é do `app/`, mas o conteúdo
dessa coluna é da tela — filtros em Hoje, lista de páginas em Notas — e a página não pode
importar de `app/`. Então ela renderiza o trecho onde ele nasce, junto do estado que o
alimenta, e o `SidebarSlot` o entrega dentro do painel. O portal preserva o contexto do
React, então nada precisa ser içado para a rota.

### Dois pesos de "ativo"

| Onde | Marca | Por quê |
|---|---|---|
| Destino no menu | pílula sólida (`ink` sobre texto `canvas`) | é a tela em que se está |
| Item na coluna da direita | pílula suave com traço | é o que está selecionado dentro dela |

São dois degraus porque as duas coisas são verdade ao mesmo tempo: estou em **Projetos**
e, dentro dele, **Casa** está selecionado. Com a mesma marca, a segunda informação
desapareceria na primeira.

### Seções da coluna da direita

Título em caixa normal com o total entre parênteses — `Projetos (7)` — e a ação à
direita, **visível o tempo todo**. Um `+` que só aparece sob o mouse é um caminho que
ninguém encontra de propósito; era assim antes, e escondia a única forma de criar
projeto pela barra.

São recolhíveis porque projetos e etiquetas crescem sem limite: quem tem vinte projetos
não deveria rolar por eles para chegar nas etiquetas. O alvo do clique é o título
inteiro — a seta sozinha é pequena demais para mirar. Recolhida, o número é o que a
seção ainda diz sobre o que está escondendo.

O traço entre seções mora no contêiner, não no grupo: elas chegam pelo portal com pais
diferentes, então nenhuma sabe sozinha se é a primeira da coluna.

**Tudo na coluna divide a mesma métrica** — 32px de altura, ícone de 16px na mesma
abscissa, canto de 10px. Projeto, etiqueta e "Mostrar concluídas" seguem a mesma régua;
quando não seguiam, cada bloco começava num lugar e a coluna parecia três listas.

## Ícone, não bolinha

Cada projeto tem um ícone escolhido de um catálogo curado de 48 desenhos do lucide
(`shared/ui/icon-catalog.tsx`). Ele é a identidade do projeto onde quer que o projeto
apareça: barra lateral, índice, cabeçalho da página e a linha da tarefa.

Antes era uma bolinha com a cor do projeto. Numa coluna de 232px com três níveis de
recuo, seis cores lado a lado viravam ruído — e a bolinha não dizia nada sobre o projeto,
só que ele era diferente do de cima. **Forma distingue melhor que matiz**, e é o que faz o
olho correr pelos nomes em vez de tropeçar nas cores.

O ícone é **monocromático e herda a cor da linha**, sem tratamento próprio: assim o par
ícone + nome acende junto no hover e no ativo, e é lido como uma coisa só. É o que a
[referência](https://linear.app) faz na barra dela.

**A cor do projeto continua existindo, e só no planner** — ela pinta o bloco na grade de
horas, que é onde distinguir de relance vale a coluna que ocupa. O diálogo diz isso no
próprio rótulo do campo ("Cor no planner"): uma escolha que parece não ter efeito é pior
que uma escolha que não existe.

Quem não escolheu ícone recebe o `#`. Chave desconhecida cai no mesmo lugar — o catálogo
pode encolher sem quebrar um projeto antigo.

**A grade do seletor tem oito colunas porque cada linha é um tema** (geral, trabalho,
estudo, código, criação, vida). Agrupa sem gastar altura com título de grupo, que em 48
ícones custaria mais do que ajuda a achar. São rádios de verdade, um por ícone: as setas
do teclado andam pela grade e o leitor de tela anuncia o nome do desenho, não uma chave.

Editar tem dois caminhos, e a razão é o espaço:

| Onde | O que abre a edição |
|---|---|
| Barra lateral | o lápis que aparece na ponta da linha, ao lado do `+` |
| Página do projeto | o próprio ícone do título, que é um botão |

Na barra não cabe um alvo de 32px; no cabeçalho cabe, e ali o ícone-botão é a coisa mais
direta que existe — clicar no que se quer trocar.

## Projetos são uma árvore

Pasta é um projeto com filhos — não há entidade separada. A hierarquia aparece em três
lugares, e cada um faz uma coisa diferente com o clique:

| Onde | O clique no nome |
|---|---|
| Coluna da direita, em **Hoje** | filtra a lista ao lado |
| Coluna da direita, nas demais telas | abre a página do projeto |
| Índice `/projects` | abre a página do projeto |

A seta de recolher é botão à parte, nunca parte da linha: recolher a pasta e abrir o
projeto são ações diferentes, e juntá-las faria uma roubar o clique da outra. Quem não
tem filhos ganha um espaço vazio **da mesma medida exata** — na primeira versão o botão
media diferente do espaçador, e cada linha começava num lugar.

**O recuo vem do aninhamento, não de um cálculo por profundidade**, e é só recuo: sem
traço ligando os irmãos. Cheguei a desenhar linhas-guia e tirei — elas não existem na
referência, e com dois ou três níveis pesam mais do que ajudam.

**A seta fica depois do nome** (`Trabalho ⌄`), como no `work ⌄` do Linear, e não numa
coluna antes dele — aquela coluna obrigava toda linha sem filhos a carregar um vão vazio.
Ela é irmã do link, nunca filha: botão dentro de link é HTML inválido e quebra o teclado.
Por isso o fundo da linha mora no contêiner, para os dois acenderem juntos.

**O contador entra no rótulo acessível** (`Trabalho, 5 em aberto`). Fora do link ele
ficaria um número solto, que o leitor de tela anuncia sem dizer de quê.

Sob o mouse, a ponta da linha troca o contador pelo `+` de criar dentro. Os dois disputam
o mesmo canto, e mostrar ambos empurraria o nome para fora numa barra estreita.

**O que foi recolhido continua recolhido** entre telas e recarregamentos
(`localStorage`). A árvore é remontada a cada navegação; sem isso, tudo voltaria aberto
toda vez — e a barra é a mesma em todas as telas, então o incômodo seria constante.

**Recolhido, o contador passa a somar a subárvore.** Sem isso, esconder os filhos
esconderia junto o trabalho pendente deles — a pasta pareceria vazia tendo doze tarefas
dentro.

No modo filtro existe uma linha **"Todas"** acima da árvore. Ela não é enfeite: sem ela,
largar o filtro dependeria de descobrir que clicar de novo no projeto ativo o solta.

A página do projeto tem **Visão geral** e **Tarefas**. A visão geral responde "como está
isto" sem ler a lista inteira — quanto falta aqui, quanto falta abaixo, e em quais
subprojetos. Cabeçalho e conteúdo são alinhados à esquerda, não centralizados: sem uma
coluna à direita, centralizar deixaria a trilha e o título desalinhados do que vem abaixo.

Títulos de seção são em **caixa normal com a seta depois do texto** (`Projetos ⌄`), e não
em versalete espaçado com a seta antes. Versalete grita para algo que é rótulo de
organização, não conteúdo; e a seta depois faz o par ser lido como um controle só.

Identidade e captura rápida dividem a primeira linha da barra. A captura é a única ação
não-navegacional ali; como ícone, ela para de competir com os destinos logo abaixo.
