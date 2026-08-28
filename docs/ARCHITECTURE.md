# Pauta — arquitetura e convenções

Workspace pessoal keyboard-first no formato do [routine.co](https://routine.co): **planner do dia
com time-blocking, tarefas, captura rápida e notas** num lugar só. Uso próprio, com app mobile
previsto para depois. **Fases 0 a 3 concluídas**; a 4 (notas) está em andamento.

Fontes da verdade: **PRODUCT.md** (produto e decisões), **DESIGN.md** (sistema visual).
Decisões novas de produto entram no PRODUCT.md — não neste arquivo.

> A pasta ainda se chama `finance-dash` por herança; o produto se chama Pauta. Renomear é seguro
> (nada depende do nome do diretório), mas melhor fazer antes do primeiro commit.

> As regras de trabalho (waves, commits, aprovação antes do push) moram no
> [`CLAUDE.md`](../CLAUDE.md) da raiz — é o arquivo carregado automaticamente a cada sessão.

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
  entities/  # domínio do front: tipos, chamadas de API, regras puras e os hooks de
             # leitura da entidade (sem UI). Chave de cache e hook de leitura descem
             # para cá assim que uma SEGUNDA feature precisa deles.
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
| Primitivos | shadcn (new-york) sobre `radix-ui` | gerados em `shared/ui/` — ver `components.json` |
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
                           # (o client é regerado no postinstall; após mudar o schema
                           #  à mão, rode `pnpm --filter @pauta/api db:generate`)
pnpm db:studio             # prisma studio

# na apps/web:
pnpm smoke <dir>           # entrada e guarda de rota, num Chrome de verdade
pnpm smoke:tasks <dir>     # tela de tarefas (criar, concluir, editar, filtrar, projeto)
pnpm smoke:write <dir>     # escritas otimistas: atrasa e derruba requisições de propósito
pnpm smoke:planner <dir>   # grade do dia
pnpm smoke:drag <dir>      # arrastar tarefa para o planner
pnpm smoke:polish <dir>    # foco, teclado e estados vazios
pnpm smoke:console <dir>   # captura rápida (Ctrl+K)
pnpm smoke:notes <dir>     # editor, nota diária e backlinks
pnpm smoke:landing <dir>   # vitrine
```

Os `smoke` cobrem o que `app.inject()` não alcança, e é de onde vieram os piores bugs do
projeto: o preflight de CORS recusando `PATCH` (invisível para os testes da API), a tarefa
recorrente que ressuscitava ao ser concluída e a corrida do autosave que apagava backlinks.

`smoke:write` é o único que mede *quando* a tela reage, e não o que a API responde: ele
atrasa as respostas em 1,5s e falha se a interface esperar por elas.

`pnpm test` roda contra o banco `pauta_test`, criado e migrado sozinho no primeiro run. As
constraints escritas à mão são exercitadas de verdade — por isso os testes não usam mock de banco.

## Convenções de código

- **Idiomas**: código, identificadores e tabelas em **inglês**; copy de UI, mensagens de erro ao
  usuário e comentários em **pt-BR**. **Commits e branches são em inglês** — ver as regras
  no `CLAUDE.md`.
- **Contratos compartilhados**: schema que valida input de usuário nasce em `packages/contracts` e
  é importado pelos dois lados. Mensagens de validação em pt-BR dentro do próprio schema.
- **Componentização (web)**: 1 seção/feature por arquivo, copy em constantes fora do JSX, estado
  local em quem usa, exports nomeados, abstração só na 2ª duplicação.
- Acessibilidade nasce com o componente: `aria-*`, `focus-visible`, estados
  (hover/disabled/loading/erro/vazio), `prefers-reduced-motion`.
- **Validação dupla**: client (UX) + constraint no banco (verdade). A tela explica, o banco garante.
- Segredos: `.env` fora do git; `JWT_SECRET` com 32+ chars.

## Rotas do front

| Rota | Quem vê |
|---|---|
| `/` | **Pública** — a vitrine. Com sessão, redireciona para `/today` |
| `/signin` | Pública — entrar |
| `/signup` | Pública — criar conta |
| `/today` | Planner e tarefas |
| `/notes` | Notas |

A vitrine usa **tema claro** com tokens próprios (`paper`, `graphite`, `rule`), escopados
em `.landing`. O app segue escuro: são públicos diferentes — a vitrine é lida uma vez, de
passagem, enquanto a ferramenta fica aberta o dia inteiro. Os dois conjuntos de tokens
convivem porque nenhum lado usa os do outro.

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
