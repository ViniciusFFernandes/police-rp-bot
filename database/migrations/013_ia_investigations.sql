-- Sistema de Assuntos Internos (IA - Internal Affairs)

CREATE TABLE IF NOT EXISTS ia_investigations (
    id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    guild_id              VARCHAR(20) NOT NULL,
    case_number           VARCHAR(30) NOT NULL,           -- ex: IA-2026-001

    -- Origem
    origin                VARCHAR(20) NOT NULL,           -- civil | internal | ois

    -- Responsável (quem abriu)
    opened_by_discord_id  VARCHAR(20) NOT NULL,
    opened_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Acusado/envolvido
    involved_discord_id   VARCHAR(20) NOT NULL,
    involved_callsign     VARCHAR(30),
    involved_badge        VARCHAR(20),
    involved_district     VARCHAR(10),

    -- Indicativo de rádio no dia do incidente
    radio_vehicle         VARCHAR(50),                    -- apenas viatura (distrito e callsign já vêm do perfil)

    -- Detalhes do incidente
    incident_date         DATE,
    incident_time         VARCHAR(10),                    -- HH:MM
    incident_location     TEXT,
    classification        TEXT,                           -- motivo / tipo
    complainant_id        TEXT,                           -- identificação do reclamante (opcional)

    -- Descrição e provas
    description           TEXT,
    evidence              TEXT,                           -- links/textos separados por vírgula

    -- Status operacional da investigação
    status                VARCHAR(20) DEFAULT 'active',   -- active | suspended | closed

    -- Encerramento
    closure_verdict       VARCHAR(30),                    -- sustained | not_sustained | exonerated | unfounded
    penalty_recommendation TEXT,
    penalty_status        VARCHAR(30),                    -- applied | not_applied | applied_modified

    -- Quadro no Discord
    board_message_id      VARCHAR(20),
    board_channel_id      VARCHAR(20),

    UNIQUE (guild_id, case_number)
);

CREATE INDEX IF NOT EXISTS idx_ia_investigations_guild ON ia_investigations (guild_id);
CREATE INDEX IF NOT EXISTS idx_ia_investigations_involved ON ia_investigations (guild_id, involved_discord_id);
