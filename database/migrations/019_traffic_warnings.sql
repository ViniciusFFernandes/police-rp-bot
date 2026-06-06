-- Advertências de trânsito

CREATE TABLE IF NOT EXISTS traffic_warnings (
    id                      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    guild_id                VARCHAR(20) NOT NULL,
    warning_number          VARCHAR(30) NOT NULL,           -- ex: ADV-2026-001

    condutor_name           VARCHAR(150) NOT NULL,
    citizen_id              VARCHAR(50)  NOT NULL,
    plate                   VARCHAR(20),
    deadline                VARCHAR(50),                    -- prazo da advertência (texto livre)

    infractions             TEXT NOT NULL,
    description             TEXT,

    registered_by_discord_id VARCHAR(20) NOT NULL,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE (guild_id, warning_number)
);

CREATE INDEX IF NOT EXISTS idx_traffic_warnings_guild ON traffic_warnings (guild_id);
CREATE INDEX IF NOT EXISTS idx_traffic_warnings_citizen ON traffic_warnings (guild_id, citizen_id);
CREATE INDEX IF NOT EXISTS idx_traffic_warnings_plate ON traffic_warnings (guild_id, plate);
