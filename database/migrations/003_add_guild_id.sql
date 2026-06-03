-- Adiciona guild_id nas tabelas que precisam de isolamento por servidor

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS guild_id VARCHAR(20);
ALTER TABLE weapons ADD COLUMN IF NOT EXISTS guild_id VARCHAR(20);

-- Índices para buscas por guild
CREATE INDEX IF NOT EXISTS idx_shifts_guild_id ON shifts (guild_id);
CREATE INDEX IF NOT EXISTS idx_weapons_guild_id ON weapons (guild_id);
CREATE INDEX IF NOT EXISTS idx_weapon_losses_guild ON weapon_losses (shift_id);

-- Índice composto para consulta de turno ativo por usuário e guild
CREATE INDEX IF NOT EXISTS idx_shifts_user_guild_status
    ON shifts (user_id, guild_id, status);
