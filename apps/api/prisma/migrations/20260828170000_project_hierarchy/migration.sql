-- Hierarquia dos projetos.
--
-- Um projeto pode conter outros: não existe entidade "pasta" separada. Uma pasta é
-- apenas um projeto com filhos, o que evita um segundo tipo com CRUD e telas próprias
-- para dizer quase a mesma coisa. É o mesmo desenho já usado nas notas.
--
-- `ON DELETE SET NULL` e não CASCADE: apagar um projeto-pai promove os filhos à raiz.
-- Levar a subárvore junto apagaria projetos inteiros — e, por tabela, as tarefas deles
-- perderiam o vínculo — por causa de uma arrumação da barra lateral.

ALTER TABLE "projects" ADD COLUMN "parent_id" UUID;

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Caso degenerado que o banco barra sozinho. Ciclos mais longos (A → B → A) dependem
-- do model, que percorre a cadeia de ancestrais antes de gravar.
ALTER TABLE "projects"
  ADD CONSTRAINT "projects_parent_not_self_check"
  CHECK ("parent_id" IS NULL OR "parent_id" <> "id");

-- O UNIQUE de nome continua valendo no usuário inteiro, e não por pai.
-- Não é descuido: o console resolve "#trabalho" pelo nome, então dois projetos
-- homônimos em pastas diferentes tornariam a captura ambígua.

CREATE INDEX "projects_user_id_parent_id_position_idx"
  ON "projects"("user_id", "parent_id", "position");
