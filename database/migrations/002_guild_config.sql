-- =============================================
-- CONFIGURAÇÕES POR SERVIDOR (GUILD)
-- =============================================

-- Substitui as colunas genéricas da tabela configuration
-- por uma tabela dedicada com todas as chaves conhecidas.

DROP TABLE IF EXISTS configuration;

CREATE TABLE IF NOT EXISTS guild_config (
    id          SERIAL PRIMARY KEY,
    guild_id    VARCHAR(20) NOT NULL,
    key         VARCHAR(100) NOT NULL,
    value       TEXT,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (guild_id, key)
);

CREATE INDEX IF NOT EXISTS idx_guild_config_guild ON guild_config (guild_id);

-- Chaves válidas e seus significados:
--   shift_channel_id          — canal onde embeds de turno são postadas
--   report_channel_id         — canal de relatórios de turno encerrado
--   weapon_report_channel_id  — canal de relatórios de extravio
--   voice_category_id         — categoria onde canais de voz são criados
--   supervisor_role_ids       — JSON array com IDs dos cargos supervisores

CREATE OR REPLACE FUNCTION trigger_set_guild_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_guild_config_updated_at ON guild_config;
CREATE TRIGGER set_guild_config_updated_at
    BEFORE UPDATE ON guild_config
    FOR EACH ROW EXECUTE FUNCTION trigger_set_guild_config_updated_at();
