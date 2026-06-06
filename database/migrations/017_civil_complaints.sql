-- Sistema de Denúncias Civis (encaminhadas para avaliação da Corregedoria)

CREATE TABLE IF NOT EXISTS civil_complaints (
    id                      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    guild_id                VARCHAR(20) NOT NULL,
    complaint_number        VARCHAR(30) NOT NULL,           -- ex: DC-2026-001

    is_anonymous            BOOLEAN DEFAULT FALSE,
    complainant_discord_id  VARCHAR(20),                    -- nulo quando anônima (não pode ser consultada depois)
    complainant_name        VARCHAR(100),

    subject                 TEXT,
    description             TEXT,
    evidence                TEXT,

    status                  VARCHAR(20) DEFAULT 'pending',  -- pending | accepted | rejected
    reviewed_by_discord_id  VARCHAR(20),
    review_note             TEXT,
    reviewed_at             TIMESTAMP WITH TIME ZONE,

    board_message_id        VARCHAR(20),
    board_channel_id        VARCHAR(20),
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE (guild_id, complaint_number)
);

CREATE INDEX IF NOT EXISTS idx_civil_complaints_guild ON civil_complaints (guild_id);
CREATE INDEX IF NOT EXISTS idx_civil_complaints_complainant ON civil_complaints (guild_id, complainant_discord_id);
