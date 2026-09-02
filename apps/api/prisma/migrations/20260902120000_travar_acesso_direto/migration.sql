-- Trava o acesso direto às tabelas.
--
-- Motivo: no Supabase o mesmo banco fica atrás de um PostgREST público. Sem isto,
-- quem tiver a URL do projeto e a chave anônima lê as tabelas inteiras — a nossa API
-- não seria contornada, seria ignorada, e com ela todas as regras que ela aplica.
--
-- A trava é dupla, de propósito:
--
-- 1. RLS ligado e NENHUMA policy. Sem policy, a resposta para os papéis públicos é
--    sempre "zero linhas". É o padrão que falha fechado: uma tabela nova que alguém
--    esqueça de proteger continua exposta, mas uma policy esquecida não abre nada.
--
-- 2. Grants revogados de `anon` e `authenticated`. Redundante hoje e proposital: no
--    dia em que alguém criar uma policy para resolver um problema pontual, a falta de
--    grant continua barrando. Duas fechaduras diferentes na mesma porta.
--
-- O que NÃO fazemos aqui, e por quê: `FORCE ROW LEVEL SECURITY`. RLS não se aplica ao
-- dono da tabela, e é como dono que a nossa API conecta. Forçar deixaria o app sem
-- acesso ao próprio banco, e a saída seria escrever policies para nós mesmos —
-- reimplementando no SQL o `userId` que o model já filtra em toda consulta.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "labels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recurrences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_labels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "note_links" ENABLE ROW LEVEL SECURITY;

-- Os papéis do PostgREST só existem no Supabase. No Postgres local e no banco de
-- teste eles não existem, e um REVOKE solto quebraria a migration nos dois — por isso
-- a guarda. A mesma migration precisa valer nos três lugares.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    REVOKE ALL ON SCHEMA public FROM anon;

    -- Sem isto, a próxima migration cria tabela já aberta: os grants padrão do
    -- Supabase valem para o que ainda vai existir, não só para o que existe hoje.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON SCHEMA public FROM authenticated;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
  END IF;
END
$$;
