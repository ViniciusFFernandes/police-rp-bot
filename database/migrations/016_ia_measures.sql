CREATE TABLE IF NOT EXISTS ia_measures (
    id                   SERIAL PRIMARY KEY,
    guild_id             TEXT NOT NULL,
    measure_number       TEXT NOT NULL UNIQUE,
    type                 TEXT NOT NULL,           -- punishment | suspension | other
    status               TEXT NOT NULL DEFAULT 'pending', -- pending | in_progress | completed
    target_discord_id    TEXT NOT NULL,
    applied_by_discord_id TEXT NOT NULL,
    duration             TEXT DEFAULT NULL,
    weapon_surrender     BOOLEAN NOT NULL DEFAULT FALSE,
    description          TEXT NOT NULL,
    board_message_id     TEXT DEFAULT NULL,
    board_channel_id     TEXT DEFAULT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
