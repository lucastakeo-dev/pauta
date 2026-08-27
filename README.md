# Pauta

Workspace pessoal keyboard-first: planner do dia com time-blocking, tarefas, captura rápida e notas.

## Começar

```bash
pnpm install
cp apps/api/.env.example apps/api/.env    # e troque o JWT_SECRET
cp apps/web/.env.example apps/web/.env
pnpm db:up                                 # Postgres em :5441
pnpm db:migrate
pnpm dev                                   # api :3334 + web :5176
```

Arquitetura, comandos e convenções: **CLAUDE.md**.
Produto e decisões: **PRODUCT.md**. Sistema visual: **DESIGN.md**.
