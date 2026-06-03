-- =============================================
-- POLICE RP BOT - SCHEMA INICIAL
-- =============================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA: configuration
-- =============================================
CREATE TABLE IF NOT EXISTS configuration (
    id          SERIAL PRIMARY KEY,
    guild_id    VARCHAR(20) NOT NULL UNIQUE,
    key         VARCHAR(100) NOT NULL,
    value       TEXT,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (guild_id, key)
);

CREATE INDEX idx_configuration_guild_key ON configuration (guild_id, key);

-- =============================================
-- TABELA: users
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    discord_id      VARCHAR(20) NOT NULL UNIQUE,
    username        VARCHAR(100) NOT NULL,
    display_name    VARCHAR(100),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_discord_id ON users (discord_id);

-- =============================================
-- TABELA: weapons
-- =============================================
CREATE TABLE IF NOT EXISTS weapons (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    serial_number   VARCHAR(50) NOT NULL UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'in_use', 'lost')),
    last_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    last_shift_id   UUID,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_weapons_serial ON weapons (serial_number);
CREATE INDEX idx_weapons_status ON weapons (status);

-- =============================================
-- TABELA: shifts
-- =============================================
CREATE TABLE IF NOT EXISTS shifts (
    id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    callsign            VARCHAR(50) NOT NULL,
    vehicle_prefix      VARCHAR(50) NOT NULL,
    weapon_serials      TEXT[] NOT NULL DEFAULT '{}',
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'ended')),
    embed_message_id    VARCHAR(20),
    voice_channel_id    VARCHAR(20),
    started_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at            TIMESTAMP WITH TIME ZONE,
    total_pause_ms      BIGINT DEFAULT 0,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shifts_user_id ON shifts (user_id);
CREATE INDEX idx_shifts_status ON shifts (status);
CREATE INDEX idx_shifts_started_at ON shifts (started_at);

-- Adicionar FK de weapons para shifts após criação
ALTER TABLE weapons ADD CONSTRAINT fk_weapons_last_shift
    FOREIGN KEY (last_shift_id) REFERENCES shifts(id) ON DELETE SET NULL;

-- =============================================
-- TABELA: pauses
-- =============================================
CREATE TABLE IF NOT EXISTS pauses (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shift_id    UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    started_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at    TIMESTAMP WITH TIME ZONE,
    duration_ms BIGINT
);

CREATE INDEX idx_pauses_shift_id ON pauses (shift_id);

-- =============================================
-- TABELA: weapon_losses
-- =============================================
CREATE TABLE IF NOT EXISTS weapon_losses (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shift_id        UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    serial_number   VARCHAR(50) NOT NULL,
    observation     TEXT,
    reported_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_weapon_losses_shift_id ON weapon_losses (shift_id);
CREATE INDEX idx_weapon_losses_serial ON weapon_losses (serial_number);
CREATE INDEX idx_weapon_losses_user_id ON weapon_losses (user_id);

-- =============================================
-- TABELA: voice_channels
-- =============================================
CREATE TABLE IF NOT EXISTS voice_channels (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shift_id        UUID NOT NULL UNIQUE REFERENCES shifts(id) ON DELETE CASCADE,
    channel_id      VARCHAR(20) NOT NULL UNIQUE,
    channel_name    VARCHAR(100) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_voice_channels_shift_id ON voice_channels (shift_id);
CREATE INDEX idx_voice_channels_channel_id ON voice_channels (channel_id);

-- =============================================
-- FUNÇÃO: updated_at automático
-- =============================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_shifts_updated_at
    BEFORE UPDATE ON shifts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_weapons_updated_at
    BEFORE UPDATE ON weapons
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
