-- Constraints que o Prisma não expressa no schema.
-- Princípio: a tela explica, o banco garante. Validação no cliente é UX; a verdade é aqui.

-- Um time-block precisa dos dois extremos, e o fim vem depois do começo.
-- Sem isto, um bug de arrastar-e-soltar no planner gravaria bloco invertido ou pela metade.
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_scheduled_range_check" CHECK (
    ("scheduled_start" IS NULL AND "scheduled_end" IS NULL)
    OR (
      "scheduled_start" IS NOT NULL
      AND "scheduled_end" IS NOT NULL
      AND "scheduled_end" > "scheduled_start"
    )
  );

-- Espelha o prioritySchema do packages/contracts (P1..P4).
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_priority_check" CHECK ("priority" BETWEEN 1 AND 4);

-- Uma task não pode ser subtask de si mesma. (Ciclos mais longos ficam por conta do
-- model; este é o caso degenerado que o banco consegue barrar sozinho.)
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_parent_not_self_check" CHECK (
    "parent_id" IS NULL OR "parent_id" <> "id"
  );

-- Estimativa é duração: zero ou negativo não significa nada.
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_estimate_positive_check" CHECK (
    "estimate_min" IS NULL OR "estimate_min" > 0
  );

-- Evento sempre termina depois de começar.
ALTER TABLE "events"
  ADD CONSTRAINT "events_range_check" CHECK ("ends_at" > "starts_at");

-- Uma nota diária por dia. UNIQUE parcial: as páginas livres (daily_on NULL) ficam de fora
-- e podem existir aos milhares.
CREATE UNIQUE INDEX "notes_user_daily_unique"
  ON "notes" ("user_id", "daily_on")
  WHERE "daily_on" IS NOT NULL;

-- Uma nota não linka para si mesma — evitaria backlink circular inútil na barra lateral.
ALTER TABLE "note_links"
  ADD CONSTRAINT "note_links_not_self_check" CHECK ("source_id" <> "target_id");

-- Busca por título da nota no autocomplete do [[link]]: trigram deixa o LIKE '%termo%'
-- usar índice em vez de varrer a tabela.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "notes_title_trgm_idx" ON "notes" USING GIN ("title" gin_trgm_ops);
