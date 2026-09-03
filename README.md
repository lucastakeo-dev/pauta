<a id="readme-top"></a>

<div align="center">
  <h1 align="center">Pauta</h1>

  <p align="center">
    Workspace pessoal keyboard-first: planner do dia com time-blocking, tarefas, captura rapida e notas.
    <br />
    <a href="docs/ARCHITECTURE.md"><strong>Explore a documentacao tecnica »</strong></a>
    <br />
    <br />
    <a href="https://github.com/lucastakeo-dev/pauta/issues">Reportar bug</a>
    &middot;
    <a href="https://github.com/lucastakeo-dev/pauta/issues">Sugerir melhoria</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#built-with">Built With</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#documentation">Documentation</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#collaborators">Collaborators</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

## About The Project

Pauta junta num lugar so o que costuma ficar espalhado em quatro apps: **planner do dia** com
grade de horas, **tarefas** com projetos e etiquetas, **captura rapida** por linguagem natural e
**notas** com nota diaria e backlinks.

Tudo e pensado para o teclado. `⌘K` captura de qualquer tela — `almoco com a Ana amanha 13h @Casa
p2` vira tarefa com data, projeto e prioridade —, e `⌘J` abre o Agent, um assistente que le e
escreve os proprios dados do app pelas mesmas regras que a interface usa.

Tres decisoes de modelagem sustentam o resto:

```txt
time-block e a propria tarefa   scheduled_start / scheduled_end na linha da task
recorrencia guarda a regra      RRULE, e as ocorrencias sao geradas na leitura
evento nasce sincronizavel      source / external_id desde o primeiro dia
```

A primeira evita uma tabela paralela que desincronizaria na primeira edicao; a segunda evita
inflar o banco com milhares de linhas mortas; a terceira faz o sync com calendario externo ser um
import, e nao uma migration dolorosa.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Built With

- [![TypeScript][typescript-shield]][typescript-url]
- [![React][react-shield]][react-url]
- [![TanStack Router][tanstack-shield]][tanstack-url]
- [![Vite][vite-shield]][vite-url]
- [![Tailwind CSS][tailwind-shield]][tailwind-url]
- [![Fastify][fastify-shield]][fastify-url]
- [![Prisma][prisma-shield]][prisma-url]
- [![PostgreSQL][postgres-shield]][postgres-url]
- [![Zod][zod-shield]][zod-url]
- [![AI SDK][aisdk-shield]][aisdk-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

### Prerequisites

- Node.js `>=22`
- pnpm `11` (nunca npm ou yarn — o workspace depende dele)
- Docker e Docker Compose
- Uma chave de IA, opcional: sem ela o app funciona inteiro e so o Agent avisa o que falta

### Installation

1. Instale as dependencias:

   ```shell
   pnpm install
   ```

2. Configure as variaveis com base nos exemplos, e troque o `JWT_SECRET`:

   ```shell
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

3. Suba o PostgreSQL local:

   ```shell
   pnpm db:up
   ```

4. Aplique as migrations:

   ```shell
   pnpm db:migrate
   ```

5. Rode o app:

   ```shell
   pnpm dev
   ```

A API sobe em `:3334`, o front em `:5176` e o Postgres em `:5441` — portas escolhidas por estarem
livres numa maquina que ja roda outros projetos.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

Fluxo principal:

- capture com `⌘K` de qualquer tela — a previa mostra o que foi entendido antes de salvar;
- processe a fila em `/inbox`: projeto, prioridade, prazo, e o item sai da fila;
- planeje em `/today`, arrastando a tarefa da lista para a grade de horas;
- clique no titulo de qualquer tarefa para abrir o modal com subtarefas e propriedades;
- organize em `/projects`, arrastando na arvore para reordenar ou aninhar;
- escreva em `/notes`, com nota diaria automatica e `[[link]]` entre paginas;
- peca ao Agent com `⌘J`: ele cria, agenda e organiza usando as mesmas regras da interface.

Scripts mais usados:

```shell
pnpm dev                 # api :3334 + web :5176
pnpm test                # vitest — a API precisa do banco de pe
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @pauta/web smoke <dir>    # fumaça num Chrome de verdade
```

As 13 suites de fumaça cobrem o que `app.inject()` nao alcanca — e e de onde vieram os piores bugs
do projeto: o preflight de CORS recusando `PATCH`, a tarefa recorrente que ressuscitava ao ser
concluida e a corrida do autosave que apagava backlinks. Os nomes estao em
[`apps/web/package.json`](apps/web/package.json) (`smoke:tasks`, `smoke:planner`, `smoke:calendar`,
`smoke:mobile`…), e cada uma sobe um Chrome de verdade contra a API local.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Project Structure

```txt
apps/
  api/
    prisma/
    src/
      config/
      controllers/
      lib/
      middlewares/
      models/
      routes/
      views/
    test/
  web/
    scripts/
    src/
      app/
      pages/
      features/
      entities/
      shared/
packages/
  contracts/
docs/
docker-compose.yml
```

O backend e **MVC**: so `models/` toca no Prisma, o controller traduz HTTP e a view monta o JSON.
O front e **em camadas**, com a direcao fixada pelo Biome:

```txt
app → pages → features → entities → shared
```

Arquivos centrais:

- `packages/contracts/src/`: schemas Zod compartilhados — validacao, tipos e OpenAPI de uma fonte so.
- `apps/api/src/models/task.model.ts`: regras de tarefa, recorrencia e a janela do planner.
- `apps/api/src/lib/agent/`: as ferramentas do Agent e o laco com o modelo.
- `apps/web/src/features/planner/`: a grade de horas, o arrastar e o compositor de horario.
- `apps/web/src/entities/`: as regras puras do front — geometria da grade, arvore de projetos, parser de datas.
- `apps/api/prisma/migrations/`: as constraints que o Prisma nao expressa moram aqui.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Documentation

- [Arquitetura e convencoes](docs/ARCHITECTURE.md)
- [Produto e decisoes](docs/PRODUCT.md)
- [Sistema visual](docs/DESIGN.md)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Collaborators

<a href="https://github.com/lucastakeo-dev" title="lucastakeo-dev">
  <img
  src="https://wsrv.nl/?url=github.com/lucastakeo-dev.png&mask=circle"
  width="56" height="56" alt="lucastakeo-dev"
  />
</a>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

Distribuido sob a licenca MIT. Veja [`LICENSE`](LICENSE) para mais informacoes.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

- Projeto: [github.com/lucastakeo-dev/pauta](https://github.com/lucastakeo-dev/pauta)
- Issues: [reportar bug ou sugerir melhoria](https://github.com/lucastakeo-dev/pauta/issues)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[typescript-shield]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[typescript-url]: https://www.typescriptlang.org/
[react-shield]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[react-url]: https://react.dev/
[tanstack-shield]: https://img.shields.io/badge/TanStack_Router-FF4154?style=for-the-badge&logo=reactquery&logoColor=white
[tanstack-url]: https://tanstack.com/router
[vite-shield]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
[vite-url]: https://vite.dev/
[tailwind-shield]: https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white
[tailwind-url]: https://tailwindcss.com/
[fastify-shield]: https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white
[fastify-url]: https://fastify.dev/
[prisma-shield]: https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white
[prisma-url]: https://www.prisma.io/
[postgres-shield]: https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white
[postgres-url]: https://www.postgresql.org/
[zod-shield]: https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white
[zod-url]: https://zod.dev/
[aisdk-shield]: https://img.shields.io/badge/AI_SDK-000000?style=for-the-badge&logo=vercel&logoColor=white
[aisdk-url]: https://ai-sdk.dev/
