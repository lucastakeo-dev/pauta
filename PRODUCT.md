# Pauta — produto e decisões

Ferramenta pessoal no formato do [routine.co](https://routine.co). O objetivo não é clonar o
produto inteiro, e sim ter o núcleo que faz ele valer a pena: **abrir o app e ver o dia**,
capturar qualquer coisa sem tirar as mãos do teclado, e ter tarefas e notas no mesmo lugar.

## Escopo do v1

Quatro módulos, entregues em fases para que cada uma seja usável sozinha.

| Fase | Entrega | Situação |
|---|---|---|
| 0 | Fundação: monorepo, banco, camadas, conta e sessão | **concluída** |
| 1 | Tarefas: CRUD, prioridade, projetos, labels, subtasks, recorrência, inbox | **concluída** |
| 2 | Planner dia/semana com time-blocking por arrastar | a fazer |
| 3 | Console (Cmd+K) com linguagem natural em pt-BR | a fazer |
| 4 | Notas: editor, nota diária, `[[links]]` e backlinks | a fazer |

Fora do v1, com o caminho já preparado: sincronização com Google Calendar, app mobile,
e um eventual módulo de finanças.

## Decisões

**Time-block é a própria task.** `scheduled_start`/`scheduled_end` moram na tabela `tasks`;
arrastar para o planner só preenche esses campos. A alternativa — uma tabela de blocos apontando
para tarefas — cria dois lugares para a mesma verdade e desincroniza na primeira edição.

**`events` nasce com `source` e `external_id`** mesmo sem Google no v1. É o gancho que faz o sync
futuro ser um import, e não uma migration dolorosa.

**Recorrência guarda a RRULE, não as ocorrências.** As futuras são geradas virtualmente na leitura
e só viram linha no banco quando a pessoa conclui ou edita aquela ocorrência específica. É o padrão
de calendário; materializar tudo encheria a tabela com milhares de linhas mortas.

**API própria em vez de falar direto com o Supabase.** Custa um app a mais para manter, mas mantém
regra de negócio num lugar só quando o mobile chegar, e deixa o PostgREST trancado.

**Auth próprio (JWT + argon2id), não Supabase Auth.** Como já existe uma API na frente, o Supabase
Auth só acrescentaria uma verificação de token de terceiro sem ganho para um app de um usuário.

**Token em `localStorage`.** Escolha consciente: é legível por JavaScript, então um XSS o levaria
junto. Cookie httpOnly exigiria CSRF e não serviria ao mobile depois. Está isolado em
`shared/api/token-storage.ts` para que trocar seja mexer num arquivo só.

**Testes contra Postgres de verdade, sem mock de banco.** Em MVC o model conversa direto com o
banco, e boa parte das regras deste projeto são constraints do Postgres. Testar com o banco fora do
circuito daria confiança falsa justamente onde a garantia mora.

## Aprendizados da Fase 1

**Teste de API não substitui teste de navegador.** Os 80 testes com `app.inject` passavam
enquanto editar tarefa estava quebrado em produção: o `inject` não passa por CORS, e o
preflight recusava `PATCH`. O smoke em Chrome real pegou em segundos. Por isso os dois
tipos de teste ficam — eles cobrem coisas diferentes.

**Filtro de leitura não pode decidir o que já foi materializado.** A primeira versão
montava o conjunto de ocorrências existentes a partir da lista já filtrada; concluir uma
ocorrência a tirava do resultado e o expansor a recriava em aberto — a tarefa concluída
ressuscitava. O conjunto agora é buscado à parte, sem filtros.

## Riscos conhecidos

**O parser de datas em português é o ponto mais incerto do v1.** O `chrono-node` declara suporte
apenas *parcial* a `pt`. O plano para a Fase 3 é usá-lo como base e escrever refiners próprios em
`lib/` para os padrões que ele erra ("amanhã 13h", "sexta que vem", "daqui 2 semanas", "toda
segunda"), com teste unitário por padrão — é função pura, então cobrir bem é barato. Se o esforço
crescer demais, o plano B é um parser próprio restrito a um conjunto explícito de padrões, com a
interpretação sempre visível na tela antes de confirmar.

**Prisma ainda não declara suporte a Node 26** (a máquina roda 26.4). Funciona hoje — migrations,
generate e runtime todos verificados — mas é um aviso a acompanhar em atualizações.

## Fora de escopo, e por quê

- **Integrações (Slack, Gmail, Notion)**: o Routine vive disso, mas cada uma é um projeto.
- **IA (resumo de reunião, agentes)**: só faz sentido quando houver dado acumulado.
- **Colaboração / multiusuário**: é ferramenta pessoal; o modelo já tem `user_id` em tudo, então
  a porta fica aberta sem custo hoje.
