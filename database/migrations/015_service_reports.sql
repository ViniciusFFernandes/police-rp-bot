-- Sistema de Relatórios de Serviço (ocorrências, prisões, crimes não resolvidos)

CREATE TABLE IF NOT EXISTS service_reports (
    id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    guild_id              VARCHAR(20) NOT NULL,
    report_number         VARCHAR(30) NOT NULL,            -- ex: SR-2026-001

    -- Tipo e status
    type                  VARCHAR(30) NOT NULL,            -- ocorrencia | prisao | crime_nao_resolvido
    status                VARCHAR(30) DEFAULT 'em_analise', -- em_analise | finalizado | resolvido | arquivado

    -- Responsável (quem abriu)
    opened_by_discord_id  VARCHAR(20) NOT NULL,
    opened_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Oficiais envolvidos (JSON array; o primeiro é o responsável/abridor)
    involved_discord_ids  TEXT NOT NULL,

    -- Detalhes do incidente
    incident_location     TEXT,
    incident_date         DATE,
    incident_time         VARCHAR(10),

    -- Narrativa
    description           TEXT,
    suspects              TEXT,
    seized_items          TEXT,

    -- Provas
    evidence              TEXT,

    -- Quadro no Discord
    board_message_id      VARCHAR(20),
    board_channel_id      VARCHAR(20),

    UNIQUE (guild_id, report_number)
);

CREATE INDEX IF NOT EXISTS idx_service_reports_guild  ON service_reports (guild_id);
CREATE INDEX IF NOT EXISTS idx_service_reports_opener ON service_reports (guild_id, opened_by_discord_id);
