-- =============================================
-- CADASTRO DE VEÍCULOS POR SERVIDOR
-- =============================================
-- Tabela de referência de viaturas disponíveis por guild.
-- O oficial escolhe o veículo ao iniciar o turno.
-- O campo shifts.vehicle_name armazena o nome selecionado (snapshot).

CREATE TABLE IF NOT EXISTS vehicles (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    guild_id    VARCHAR(20) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (guild_id, name)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_guild ON vehicles (guild_id, is_active);

-- Nome do veículo associado ao turno (snapshot do momento da abertura).
-- Pode ser NULL em turnos legados ou quando não houver veículos cadastrados.
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS vehicle_name VARCHAR(100);
