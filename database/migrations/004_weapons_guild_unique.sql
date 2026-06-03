-- A mesma série de arma pode existir em servidores distintos.
-- Remove a constraint global e cria uma por (serial_number, guild_id).

ALTER TABLE weapons DROP CONSTRAINT IF EXISTS weapons_serial_number_key;
DROP INDEX IF EXISTS idx_weapons_serial;

ALTER TABLE weapons ADD CONSTRAINT weapons_serial_guild_unique
    UNIQUE (serial_number, guild_id);

CREATE INDEX IF NOT EXISTS idx_weapons_serial_guild ON weapons (serial_number, guild_id);
