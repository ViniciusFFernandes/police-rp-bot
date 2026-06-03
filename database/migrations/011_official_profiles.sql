-- Perfil operacional do oficial por servidor.
-- Armazena distrito e callsign para não precisar digitar a cada turno.
CREATE TABLE IF NOT EXISTS official_profiles (
    id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guild_id     VARCHAR(20) NOT NULL,
    district     VARCHAR(10) NOT NULL,
    callsign_num VARCHAR(10) NOT NULL,
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, guild_id)
);

CREATE INDEX IF NOT EXISTS idx_official_profiles_user_guild ON official_profiles (user_id, guild_id);

CREATE OR REPLACE FUNCTION trigger_set_official_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_official_profiles_updated_at ON official_profiles;
CREATE TRIGGER set_official_profiles_updated_at
    BEFORE UPDATE ON official_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_official_profiles_updated_at();
