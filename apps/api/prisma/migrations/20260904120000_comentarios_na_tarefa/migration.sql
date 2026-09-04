-- Comentários datados numa tarefa.

CREATE TABLE "task_comments" (
  "id" UUID NOT NULL,
  "task_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "body" VARCHAR(5000) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "edited_at" TIMESTAMPTZ(3),

  CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- A leitura é sempre "os comentários desta tarefa, em ordem". O índice cobre as duas
-- partes de uma vez, então a lista sai sem ordenação extra.
CREATE INDEX "task_comments_task_id_created_at_idx" ON "task_comments" ("task_id", "created_at");
CREATE INDEX "task_comments_user_id_idx" ON "task_comments" ("user_id");

ALTER TABLE "task_comments"
  ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id")
  REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_comments"
  ADD CONSTRAINT "task_comments_user_id_fkey" FOREIGN KEY ("user_id")
  REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comentário vazio não é comentário. O schema Zod já barra na entrada; aqui é a garantia
-- que vale para qualquer caminho até a tabela — princípio: a tela explica, o banco garante.
ALTER TABLE "task_comments"
  ADD CONSTRAINT "task_comments_body_not_blank_check" CHECK (btrim("body") <> '');

-- Tabela nova nasce trancada, como as outras: RLS ligado e nenhuma policy, para o
-- PostgREST público do Supabase responder sempre zero linha. Ver a migration
-- 20260902120000_travar_acesso_direto.
ALTER TABLE "task_comments" ENABLE ROW LEVEL SECURITY;
