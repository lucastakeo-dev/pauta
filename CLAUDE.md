# Pauta

Workspace pessoal keyboard-first no formato do [routine.co](https://routine.co): **planner do dia
com time-blocking, tarefas, captura rápida e notas** num lugar só. Uso próprio, com app mobile
previsto para depois. **Fases 0 e 1 concluídas** (fundação + tarefas).

Fontes da verdade: **PRODUCT.md** (produto e decisões), **DESIGN.md** (sistema visual).
Decisões novas de produto entram no PRODUCT.md — não neste arquivo.

> A pasta ainda se chama `finance-dash` por herança; o produto se chama Pauta. Renomear é seguro
> (nada depende do nome do diretório), mas melhor fazer antes do primeiro commit.

## Como trabalhar neste projeto

**Idioma da conversa:** português brasileiro por padrão. (Código e identificadores seguem
em inglês; copy de UI, comentários e mensagens de erro em pt-BR — ver Convenções.)

**Postura:** engenheiro sênior. Ler o contexto antes de propor solução, implementar quando
fizer sentido e validar com teste ou comando — não com suposição. Mudanças pequenas e
alinhadas ao padrão que já existe. Dúvida importante vira pergunta, não suposição.
Ao explicar, ser direto sem esconder o raciocínio.

### Waves

Tarefa grande é quebrada em **waves** — blocos sequenciais e fechados. Cada wave declara:

- objetivo;
- arquivos ou áreas afetadas;
- status;
- próximos passos.

Exemplo: `Wave 1 — Fix auth` · `Wave 2 — Fix home` · `Wave 3 — Improve dashboard`
· `Wave 4 — Tests and cleanup`.

### Branches e commits

Conventional Commits em **inglês**, curtos e específicos.

Prefixos: `feat:` `fix:` `chore:` `docs:` `refactor:` `test:`

- Errado: `codex/fix-description` — genérico, e "codex" não entra em nome nenhum.
- Certo: `fix/login-token-expiry`

Sem linha de `Co-Authored-By` nos commits.

### Aprovação antes do push

Ao fim de cada tarefa, apresentar um overview com: mudanças realizadas, arquivos
afetados, decisões tomadas e validações executadas. **O push só acontece após aprovação
explícita** — nunca por iniciativa própria.

### Documentação

Ao fim de cada tarefa, atualizar `docs/agents.md` refletindo as mudanças.
**Hoje esse arquivo não existe neste projeto, então a regra está inativa** — não criar
por conta própria; só passa a valer se ele for pedido explicitamente.

## Arquitetura

Monorepo pnpm com três pacotes:

```
apps/api            # Fastify em MVC: toda a regra de negócio e o acesso a dados
apps/web            # SPA Vite em camadas: planner, tarefas, console e notas
packages/contracts  # Schemas Zod compartilhados — o front valida com o MESMO schema da API
```

O front **nunca** fala com o banco: tudo passa pela API. Supabase é o Postgres gerenciado
(produção); em dev o banco é um container Postgres puro.

### Backend — MVC (regras inegociáveis)

```
apps/api/src/
  models/       # M: entidade + regra de negócio + persistência (único lugar com Prisma)
  views/        # V: presenters — montam o JSON de saída
  controllers/  # C: traduz HTTP, chama o model, devolve a view
  routes/       # mapeia verbo+path -> controller, aplica auth
  middlewares/  # autenticação JWT, handler central de erros
  config/       # env validada com Zod no boot, cliente Prisma
  lib/          # utilitários puros (erros de domínio, datas, recorrência)
```

- **Model gordo, controller magro.** Regra de negócio mora no model; o controller não tem `if`
  de domínio — só status code, token e leitura da request.
- **Só o model importa Prisma.** Tipos do Prisma não vazam de `models/`.
- **A view decide o JSON.** Mapeamento campo a campo; nada de spread do registro do banco.
- **Erros de domínio** (`DomainError`, mensagem pt-BR + `code` estável) tratados no handler
  central. Erro cru do Prisma nunca chega ao cliente.
- **Env sempre via schema Zod** — nada de `process.env` solto.
- **Toda rota nasce com teste** Vitest usando `app.inject`.

As duas primeiras regras são **verificadas pelo lint** (`biome.json`), não pela memória de quem
escreve: importar Prisma num controller ou Fastify num model quebra o `pnpm lint`.

### Frontend — camadas

```
apps/web/src/
  app/       # bootstrap: providers, router, guardas de rota, tokens
  pages/     # apresentação: uma rota = uma composição, sem regra
  features/  # casos de uso: auth/ e, adiante, planner/ tasks/ console/ notes/
  entities/  # domínio do front: tipos, chamadas de API, regras puras (sem React)
  shared/    # ui/ (componentes), api/ (client HTTP), lib/, hooks/, config/
```

Direção de dependência, **também garantida pelo lint**:

```
app → pages → features → entities → shared
```

Nunca para cima, nunca lateral entre features. Dentro da própria feature, use caminho relativo
(`./`); o que for comum a duas features desce para `entities` ou `shared`.

## Stack

| Camada | Ferramenta | Papel |
|---|---|---|
| Front | Vite 8 + React 19 + TS 6 strict | TanStack Router file-based; `routeTree.gen.ts` é gerado e **commitado** |
| Estilo | Tailwind v4 (tokens em `apps/web/src/app/styles.css`) | tokens: `canvas`, `surface`, `ink`, `iris`, `p1..p4` |
| API | Node + Fastify 5 + TypeScript | dev: `tsx watch` |
| Validação | Zod 4 via `fastify-type-provider-zod` | schema Zod = validação + tipos, uma fonte só |
| ORM | Prisma 7 | **dono do schema**; migrations em `apps/api/prisma/migrations` |
| Auth | JWT próprio (`@fastify/jwt`) + argon2id | token de 30d guardado em `localStorage` |
| Banco dev | Docker `pauta-db` (postgres:17-alpine) em `127.0.0.1:5441` | 5432/5433/5439/55432 estão ocupadas por outros projetos da máquina |
| Banco prod | Supabase | pooler em `DATABASE_URL`, direta em `DIRECT_DATABASE_URL` (migrations exigem a direta) |
| Lint/format | **Biome 2** (`biome.json` na raiz, único pros 3 pacotes) | 2 espaços, aspas simples, sem `;`, largura 100 |
| Pacotes | **pnpm** workspaces | nunca npm/yarn |

**Portas:** API `3334`, web `5176`, Postgres `5441`. Escolhidas por estarem livres — 5173/5174/5175
e 3001/4000 pertencem a outros projetos.

### Prisma 7 muda duas coisas

1. A URL de conexão **não fica no `schema.prisma`**: migrations leem `prisma7.config.ts`; o runtime
   conecta pelo driver adapter (`@prisma/adapter-pg`) em `src/config/prisma.ts`.
2. Não há mais engine binário — o adapter usa o driver `pg` nativo.

## Comandos

```bash
pnpm db:up                 # sobe o Postgres de dev (docker compose)
pnpm dev                   # api :3334 + web :5176 em paralelo
pnpm dev:api | dev:web     # um de cada vez
pnpm lint                  # biome check (raiz cobre o monorepo inteiro)
pnpm format                # biome check --write
pnpm typecheck             # tsc em todos os pacotes
pnpm test                  # vitest (a API precisa do banco de pé)
pnpm db:migrate            # prisma migrate dev
pnpm db:studio             # prisma studio

# na apps/web:
pnpm smoke <dir>           # fluxo de entrada num Chrome de verdade + screenshots
pnpm smoke:tasks <dir>     # fluxo da tela de tarefas (criar, concluir, editar, filtrar)
```

Os dois `smoke` cobrem o que `app.inject()` não alcança — foi assim que apareceu o
preflight de CORS recusando `PATCH`, invisível para os 80 testes da API.

`pnpm test` roda contra o banco `pauta_test`, criado e migrado sozinho no primeiro run. As
constraints escritas à mão são exercitadas de verdade — por isso os testes não usam mock de banco.

## Convenções de código

- **Idiomas**: código, identificadores e tabelas em **inglês**; copy de UI, mensagens de erro ao
  usuário, comentários e commits em **pt-BR**.
- **Contratos compartilhados**: schema que valida input de usuário nasce em `packages/contracts` e
  é importado pelos dois lados. Mensagens de validação em pt-BR dentro do próprio schema.
- **Componentização (web)**: 1 seção/feature por arquivo, copy em constantes fora do JSX, estado
  local em quem usa, exports nomeados, abstração só na 2ª duplicação.
- Acessibilidade nasce com o componente: `aria-*`, `focus-visible`, estados
  (hover/disabled/loading/erro/vazio), `prefers-reduced-motion`.
- **Validação dupla**: client (UX) + constraint no banco (verdade). A tela explica, o banco garante.
- Segredos: `.env` fora do git; `JWT_SECRET` com 32+ chars.

## Endpoints

Públicos: `GET /health`, `POST /auth/register`, `POST /auth/login`.
Com token: `GET /auth/me`, e os CRUDs de `/tasks`, `/projects` e `/labels`.

`GET /tasks` aceita `projectId`, `labelId`, `status`, `parentId`, `rootOnly`, `search`,
`dueBefore`, `includeDone` e a janela `scheduledFrom`/`scheduledTo`. **Com a janela, as
recorrências são expandidas**; sem ela, aparece só o molde da recorrência.

Uma ocorrência ainda não materializada é endereçada por `uuid@AAAA-MM-DD`. Concluir ou
editar uma delas cria a linha de verdade (`POST /tasks/:id/toggle`, `PATCH /tasks/:id`).

## Regra de dado mora no banco

O que o Prisma não expressa está em
`prisma/migrations/20260827174554_constraints_de_dominio/migration.sql`:

- time-block precisa dos dois extremos e o fim vem depois do começo;
- prioridade entre 1 e 4, estimativa positiva;
- task não é subtask de si mesma; nota não linka para si mesma;
- evento termina depois de começar;
- **uma nota diária por dia** (UNIQUE parcial — páginas livres ficam de fora);
- índice trigram no título da nota, para o autocomplete do `[[link]]`.
