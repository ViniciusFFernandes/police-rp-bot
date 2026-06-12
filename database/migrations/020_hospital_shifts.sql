-- Turnos do Hospital

CREATE TABLE IF NOT EXISTS hospital_shifts (
    id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    guild_id         VARCHAR(20)  NOT NULL,
    discord_id       VARCHAR(20)  NOT NULL,
    display_name     VARCHAR(150),
    status           VARCHAR(20)  NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'paused', 'ended')),
    embed_message_id VARCHAR(20),
    started_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at         TIMESTAMP WITH TIME ZONE,
    total_pause_ms   BIGINT NOT NULL DEFAULT 0,
    ended_by         VARCHAR(20)   -- discord_id de quem encerrou (supervisor)
);

CREATE TABLE IF NOT EXISTS hospital_pauses (
    id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shift_id   UUID NOT NULL REFERENCES hospital_shifts(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at   TIMESTAMP WITH TIME ZONE,
    duration_ms BIGINT
);

CREATE INDEX IF NOT EXISTS idx_hospital_shifts_guild    ON hospital_shifts (guild_id);
CREATE INDEX IF NOT EXISTS idx_hospital_shifts_user     ON hospital_shifts (guild_id, discord_id);
CREATE INDEX IF NOT EXISTS idx_hospital_shifts_active   ON hospital_shifts (guild_id, status) WHERE status IN ('active', 'paused');
CREATE INDEX IF NOT EXISTS idx_hospital_pauses_shift    ON hospital_pauses (shift_id);
