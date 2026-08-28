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
