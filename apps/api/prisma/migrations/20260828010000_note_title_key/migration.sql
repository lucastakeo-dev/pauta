-- Chave normalizada do título da nota.
--
-- É por ela que o `[[link]]` encontra a página: sem um UNIQUE sobre a forma sem acento
-- e em minúsculas, "[[casa]]" e "[[Casa]]" virariam duas notas diferentes, e o
-- backlink apontaria para a metade errada.
--
-- O model mantém a coluna (ver src/lib/note-links.ts → normalizeTitle). Aqui o backfill
-- usa apenas lower(), que basta para as linhas já existentes.

ALTER TABLE "notes" ADD COLUMN "title_key" VARCHAR(300);

UPDATE "notes" SET "title_key" = lower(btrim("title")) WHERE "title_key" IS NULL;

ALTER TABLE "notes" ALTER COLUMN "title_key" SET NOT NULL;

CREATE UNIQUE INDEX "notes_user_id_title_key_key" ON "notes"("user_id", "title_key");
