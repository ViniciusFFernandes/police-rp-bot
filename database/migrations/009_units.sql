-- =============================================
-- CADASTRO DE UNIDADES POR SERVIDOR
-- =============================================
-- Unidades operacionais disponíveis (A, L, K, E, RPM...).
-- O oficial seleciona a unidade ao iniciar o turno; o campo não é mais
-- digitado livremente no modal.

CREATE TABLE IF NOT EXISTS units (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    guild_id    VARCHAR(20) NOT NULL,
    name        VARCHAR(20) NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (guild_id, name)
);

CREATE INDEX IF NOT EXISTS idx_units_guild ON units (guild_id, is_active);
