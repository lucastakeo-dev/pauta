# Pauta — sistema visual

Os tokens vivem em `apps/web/src/app/styles.css`, dentro do `@theme` do Tailwind v4. Este
documento explica **por que** cada um existe; o arquivo é a fonte da verdade dos valores.

## Princípios

**O dado é a interface.** A tela mais importante é uma grade de horas com blocos. Tudo que não for
o dado — bordas, fundos, rótulos — recua para que a grade seja legível num relance.

**Cor tem significado.** Um único acento (`iris`) para ação e foco. Fora dele, cor só aparece em
prioridade (`p1..p4`) e no marcador de "agora". Se tudo colore, nada chama atenção.

**Escuro por natureza, claro por escolha.** O app abre escuro e há um tema claro no menu da
conta. A escolha é explícita na tag `<html>`, nunca `prefers-color-scheme`: um planner usado o
dia inteiro não deve mudar de cara ao anoitecer.

**Teclado em primeiro lugar.** `:focus-visible` tem estilo próprio e **nunca** é removido. Toda
ação alcançável pelo mouse precisa ser alcançável pelo teclado.

## Superfícies

Cinco degraus pequenos, do fundo para a frente: `shell` → `canvas` → `surface` →
`surface-raised` → `surface-overlay`. O primeiro entrou com a moldura de painéis
flutuantes e não recebe conteúdo nenhum: é só o vão entre o trilho, o menu e a tela. Os passos são curtos de propósito: numa grade com dezenas de linhas, contraste
alto entre faixas vira listra e cansa.

Traços em dois pesos: `line` para separar, `line-strong` para delimitar o que é interativo.

## Dois temas

O escuro é o padrão; o claro está no menu da conta e é lembrado entre sessões.

**O claro não é o escuro com os números invertidos.** Em fundo claro, elevação se lê por
**tinta**, não por brilho: `surface-raised` — o fundo do hover e do selecionado — fica mais
escuro que `surface`, ao contrário do escuro, onde fica mais claro. O que se preserva é o papel
de cada token, não a posição dele na régua.

O branco é levemente quente (matiz 85). Branco puro num painel grande cansa quem passa o dia na
tela, e cinza neutro deixa a interface com cara de rascunho.

**O acento escurece no claro.** O íris do escuro (L 0.68) sobre branco dá ~3,5:1, abaixo do
mínimo para texto; no claro ele vai a 0.52. É a mesma cor com o mesmo papel, num contraste que
serve à superfície.

Duas coisas fazem a troca funcionar sem remendo:

- **A classe mora em `<html>`**, e um script embutido no `index.html` a aplica antes do primeiro
  pixel. O bundle é módulo, então roda depois da primeira pintura: sem esse script, quem escolheu
  claro abriria escuro por um quadro.
- **`color-scheme` acompanha o tema.** É ele que pinta barra de rolagem, seletor de data e hora e
  o resto dos controles nativos, que não leem os nossos tokens.

A vitrine tem paleta própria (`paper`, `graphite`) e não participa da troca: ela é lida uma vez,
de passagem, e o app fica aberto o dia inteiro.

## Texto

Três níveis, e só três: `ink` (o conteúdo), `ink-muted` (rótulos e apoio), `ink-subtle` (metadados
e estados vazios). Mais níveis que isso viram decisão sem critério.

Duas vozes: **Inter** para tudo que se lê, **JetBrains Mono** para tudo que se compara — horas,
durações, contadores. A classe `.tabular` fixa numerais tabulares para que números não "dancem"
ao atualizar.

## Prioridades

`p1` vermelho, `p2` âmbar, `p3` azul, `p4` cinza. A escala vai do urgente ao neutro, e `p4` é
propositalmente sem cor: a maioria das tarefas é P4, e colorir todas anularia o sinal.

Na lista, a cor vem acompanhada de **altura**: são três barras, e a prioridade decide
quantas acendem. Cor sozinha não é sinal para quem não a distingue.

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

| Tom | Ícone | Papel ARIA | Some em | Quando |
|---|---|---|---|---|
| Confirmação | círculo com risco, verde | `status` (polido) | 3,5s | a ação deu certo |
| Informação | `i`, iris | `status` (polido) | 4,5s | algo aconteceu e vale saber |
| Aviso | triângulo, âmbar | `alert` (assertivo) | 5,5s | deu certo, mas com ressalva |
| Falha | círculo com ×, vermelho | `alert` (assertivo) | 6s | a ação falhou e foi desfeita |

São dois papéis porque a urgência difere: a confirmação espera a próxima pausa da
leitura; a falha corrige algo que a pessoa acabou de ver acontecer, e esperar chegaria
tarde. Nenhuma das duas leva `aria-label` — esses papéis não aceitam nome, e a mensagem
já é o conteúdo.

**Os avisos moram no canto superior direito**, empilhados e com largura fixa. Embaixo e
ao centro — onde ficavam — eles cobriam justamente o que a ação acabou de mudar: a lista
de tarefas e a grade ocupam o meio da tela.

**Duas linhas, não uma.** O título diz qual ação respondeu ("Não consegui excluir a
tarefa."); a segunda linha traz o que o servidor explicou ("Já existe um projeto com esse
nome."). Antes a mensagem da API *substituía* a nossa, e sobrava um motivo sem dono. Há
espaço também para uma ação no aviso — desfazer, abrir, tentar de novo.

**Entra e sai pela mesma borda**, deslizando da direita com fade: 250ms para entrar,
150ms para sair. A saída existe porque dispensar era um corte seco — o cartão deixava de
existir no meio do quadro e o olho não tinha o que acompanhar. Ela é mais rápida que a
entrada de propósito: chegar pede atenção, ir embora não.

Mensagens iguais seguidas viram uma só com contador (`Tarefa concluída. ×3`). Sem isso,
a regra do "sempre Toast" tornaria a ação mais repetida do app numa pilha de avisos. Um
aviso que já está saindo não recebe contador: ele vai embora em 180ms, e o número
apareceria só para sumir junto.

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
| **Painel** | 272px | o nome da seção ativa e o que há **dentro dela** |
| **Tela** | o resto | o conteúdo da página |

**O trilho troca de seção; o painel mostra o que há dentro dela.** Esta é a regra, e ela
custou uma versão para ficar clara: a primeira repetia os três destinos dentro do painel,
de modo que clicar no calendário levava às mesmas três opções de novo e a coluna inteira
não dizia nada sobre o calendário. Um painel que espelha o trilho é uma coluna inteira
gasta para não dizer nada.

| Seção | O painel mostra |
|---|---|
| **Hoje** | as telas do calendário, e abaixo os filtros da lista |
| **Projetos** | a árvore e o `+` |
| **Notas** | busca, a nota de hoje e a lista de páginas |

Antes de tudo isso houve uma faixa no topo, com marca, navegação e sair; ela custava uma
linha inteira de altura para dizer o que a barra já podia dizer. Depois houve uma barra
só, de 232px.

**Recolher o painel deixa a navegação inteira em 52px.** Enquanto a barra era a única
navegação do app, ela não podia ser escondida — abaixo de ~768px comia a tela e não havia
o que fazer. É isso que o trilho paga, e o que foi recolhido continua assim entre telas e
recargas.

Para quem navega por marcos, trilho e painel são **uma região só** (`aside` com nome).
Separá-los daria dois `complementary` sem nome útil. Os destinos aparecem **uma vez só**,
no trilho, num `nav` chamado "Seções"; o painel os nomeia por um cabeçalho, não por links.

**A coluna do painel vem da página, por portal.** O painel é do `app/`, mas o conteúdo
dele é da tela, e a página não pode importar de `app/`. Então ela renderiza o trecho onde
ele nasce, junto do estado que o alimenta, e o `SidebarSlot` o entrega dentro do painel.
O portal preserva o contexto do React, então nada precisa ser içado para a rota.

### Dois pesos de "ativo"

| Onde | Marca | Por quê |
|---|---|---|
| Destino no trilho | chip com fundo `surface-raised` | é a seção em que se está |
| Item selecionado no painel | fundo tinto **e barra de acento** na borda esquerda | é o que está aberto |
| Pasta no caminho até ele | só o peso do texto | mostra como se chegou lá |

São três degraus porque as três coisas são verdade ao mesmo tempo: estou em **Projetos**,
dentro dele **Fase 1** está aberto, e ele mora dentro de **Trabalho › Plataforma**.

A barra substituiu um anel de 1px em volta da linha. O anel dizia "isto é uma caixa", não
"isto é o item em que você está" — e, numa lista de linhas encostadas, virava mais um
traço entre tantos. A barra aponta uma linha só, na margem por onde o olho desce a lista.

**A barra não sobe pela árvore.** As pastas do caminho ganham apenas o peso do texto: se
a barra subisse, três linhas diriam "é aqui" ao mesmo tempo. Sem marca nenhuma, porém, a
pasta some entre as vizinhas e a hierarquia deixa de dizer onde se está.

### Seções do painel

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
abscissa, canto de 10px. As classes moram em `shared/ui/sidebar-row.ts` porque as listas
são feitas por features que não se conhecem — projeto, etiqueta, tela do planner, página
de nota — e todas caem na mesma coluna. Enquanto cada uma trazia a própria altura, a
coluna parecia quatro listas empilhadas em vez de uma.

## As três telas do planner

`Hoje` tem três, escolhidas no painel e não numa faixa de abas sobre a grade — a faixa
repetiria a função do painel e comeria altura da grade, que é a tela pela qual o produto
existe.

| Tela | O que é |
|---|---|
| **Dia** | lista de tarefas e a grade do dia lado a lado |
| **Semana** | sete colunas na mesma grade, com a régua de horas à esquerda |
| **Só o calendário** | a grade do dia sozinha, na largura toda |

A escolha sobrevive ao recarregar: é preferência de quem olha, não dado de servidor.

**Cada coluna de dia é um alvo de soltura próprio, com a data no id.** É o que faz a
semana funcionar sem uma segunda regra de arrastar: quem recebe a soltura já sabe em que
dia caiu. Enquanto havia um alvo só, o dia vinha de fora — de quem renderizava a grade —
e numa tela com sete colunas essa informação não existe em lugar nenhum além do alvo.

Trocar de coluna leva o **horário** junto: as 14h de terça arrastadas para quinta viram
14h de quinta. Recalcular pela posição do ponteiro perderia o ponto onde o bloco foi
pego, e ele saltaria para debaixo do cursor.

Na semana, hoje ganha o acento no número do dia — é a coluna que se procura ao abrir. E o
"nenhum compromisso" fala uma vez só, no lugar da grade: sete vezes a mesma frase seria
ruído, não informação.

## O inbox: fila e detalhe

A tela existe para dar saída ao que o `⌘K` captura. Antes dela, capturar era fácil e
decidir era impossível: tudo nascia com status `inbox` e nada tirava de lá.

A fila fica **na barra**, não na tela. É a mesma coluna que lista projetos e páginas de
nota, e pela mesma razão: é o índice de onde se está, e o que muda ao escolher um item é
a tela ao lado — não a coluna inteira.

**Duas linhas por item, e a segunda só quando tem o que dizer.** Título em cima; embaixo
projeto e prazo, quando existem. Escrever "sem projeto" em toda captura nova encheria a
fila de uma informação que é sempre a mesma — e é justamente o que a tela serve para
resolver. À direita, a idade (`hoje`, `3d`, `2sem`): numa fila de captura, o que está
parado há três semanas é o que mais precisa de uma decisão, nem que seja apagar.

A bolinha de prioridade ocupa a coluna de 16px dos ícones, no eixo dos projetos e das
etiquetas — a fila divide a régua do painel com o resto. **P4 não tem cor**: a maioria é
P4, e colorir todas anularia o sinal.

**A seleção segue a posição, não o id.** Processar tira o item da fila, e quem estava
embaixo sobe para o cursor — como numa caixa de e-mail. Voltar ao topo a cada
processamento faria a fila ser trabalhada sempre pelo primeiro item. Com a fila vazia, a
seleção é `null` e os dois lados mostram o vazio.

**As setas percorrem a fila levando o foco junto.** Tab também funciona — cada linha é um
botão de verdade —, mas Tab é para sair da lista, não para andar por ela: com trinta
capturas, chegar à última custaria trinta paradas.

Na tela, o item aberto ganha duas colunas com um traço entre elas: à esquerda o que se lê
e escreve (título e anotação, numa medida de leitura), à direita o que se decide —
prioridade, projeto, prazo, planner e etiquetas. Sem o traço, as propriedades pareciam
soltas na borda em vez de um painel.

A trilha do cabeçalho diz `Inbox · 2 de 3`, e não o título: ele está 40px abaixo, em corpo
maior. Quanto falta é o que não aparece em nenhum outro lugar da tela.

**Processar só troca o status.** Não conclui, não apaga: a tarefa segue viva nas listas e
apenas deixa de ser um item por decidir. Concluir e Excluir estão ao lado, nomeados pelo
que fazem.

Título e anotação salvam **ao sair do campo**, não a cada tecla — uma requisição por letra
digitada encheria a fila de escritas e a tela de avisos.

## A lista de tarefas é uma tabela

Uma tarefa é **uma linha de 36px**, e não um cartão de duas. Antes, título em cima e uma
faixa de projeto, prazo e etiquetas embaixo: doze tarefas já enchiam a tela e a lista
rolava três vezes mais do que precisava. Agora o título ocupa o espaço que sobra e tudo
que o descreve fica encostado à direita, na mesma ordem em toda linha — é o que permite
descer a coluna procurando um prazo sem reler o meio de cada tarefa.

A ordem da direita, de dentro para fora: subtarefas, recorrência, hora, prazo, projeto,
etiquetas, prioridade. As duas pontas são as que se procuram de longe, então são as que
ficam nos extremos.

**Só ganha pílula o que tem cor própria.** Etiqueta é pílula tingida da própria cor;
atraso é pílula vermelha. Hora, prazo no futuro e projeto são texto. Fundo cinza em toda
informação transformaria a linha numa fileira de caixinhas, e a mancha vermelha do atraso
— a única que precisa ser vista antes de qualquer outra coisa — deixaria de se destacar.

O texto da etiqueta não é a cor crua do banco: ela é puxada 20% na direção da tinta do
tema. Uma cor escolhida no seletor não sabe sobre que fundo vai cair, e um verde com 2:1
de contraste sobre branco é ilegível no tema claro por mais bonito que seja no escuro.

**Prioridade em barras, não em bolinha.** Três barras de alturas diferentes, como sinal de
celular: P1 acende as três, P4 nenhuma. A bolinha anterior dizia a prioridade pela cor e
só pela cor — quem não distingue vermelho de laranja via duas tarefas iguais. Altura se lê
antes de matiz, e o indicador foi para a ponta direita junto com o resto do que descreve a
tarefa, deixando o começo da linha só com a caixa de marcar e o título.

**As ações cobrem a ponta direita quando o ponteiro entra**, com o mesmo fundo da linha
sob o mouse e um degradê à esquerda — o que estava ali some, não é cortado ao meio.
Reservar espaço fixo para elas custaria a coluna que hoje mostra prazo e etiquetas.

O cabeçalho de grupo é uma linha da mesma altura, com um círculo que muda de forma além de
cor (cheio para o vencido, tracejado para o sem data) e a contagem ao lado do nome. Ele
começa com os mesmos vãos da linha de tarefa — alça e caixa de marcar — para o nome do
grupo cair na mesma abscissa dos títulos abaixo dele.

O campo de nova tarefa continua acima da lista. A referência tem ali um botão que abre um
formulário; digitar e apertar Enter é mais curto que isso, e o `⌘K` já cobre a captura com
data em linguagem natural.

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

**O recuo vem do aninhamento, não de um cálculo por profundidade**, e leva um traço
ligando os irmãos. Ele já esteve fora: a referência de então não o tinha, e sem ele a
árvore parecia mais leve. A referência seguinte o tem, e com ele a subárvore lê como um
bloco em vez de linhas soltas mais à direita. O traço é a borda esquerda da lista, não um
desenho por linha, e `ml-4` o põe exatamente no centro do ícone do pai — 8px de padding
mais metade de um ícone de 16. Alinhar por olho deixava um degrau visível a cada nível.

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
