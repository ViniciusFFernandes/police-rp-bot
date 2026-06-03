-- Arsenal pessoal do oficial — armas cadastradas independente de turno
CREATE TABLE IF NOT EXISTS official_weapons (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guild_id        VARCHAR(20) NOT NULL,
    weapon_name     VARCHAR(100) NOT NULL,
    serial_number   VARCHAR(50) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (guild_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_official_weapons_user_guild ON official_weapons (user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_official_weapons_serial_guild ON official_weapons (guild_id, serial_number);
