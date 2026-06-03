const db = require('../database/pool');

async function upsert(discordId, username, displayName) {
    const { rows } = await db.query(
        `INSERT INTO users (discord_id, username, display_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (discord_id) DO UPDATE
         SET username = EXCLUDED.username, display_name = EXCLUDED.display_name
         RETURNING *`,
        [discordId, username, displayName]
    );
    return rows[0];
}

async function findByDiscordId(discordId) {
    const { rows } = await db.query(
        'SELECT * FROM users WHERE discord_id = $1',
        [discordId]
    );
    return rows[0] || null;
}

// Estatísticas considerando TODAS as participações do oficial na unidade
// (líder ou membro), não apenas turnos em que foi o líder.
async function getStats(discordId, guildId) {
    const { rows } = await db.query(
        `WITH participated AS (
            SELECT s.id, s.started_at, s.ended_at, s.total_pause_ms, s.status
            FROM shifts s
            JOIN shift_members sm ON sm.shift_id = s.id
            JOIN users u ON u.id = sm.user_id
            WHERE u.discord_id = $1 AND s.guild_id = $2
         )
         SELECT
            $1::text AS discord_id,
            (SELECT display_name FROM users WHERE discord_id = $1) AS display_name,
            COUNT(*) FILTER (WHERE status = 'ended') AS total_shifts,
            COALESCE(SUM(
                EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000 - total_pause_ms
            ) FILTER (WHERE status = 'ended'), 0) AS effective_ms,
            COALESCE(SUM(total_pause_ms) FILTER (WHERE status = 'ended'), 0) AS total_pause_ms,
            (SELECT COUNT(*) FROM pauses p WHERE p.shift_id IN (SELECT id FROM participated)) AS total_pauses,
            (SELECT COUNT(*) FROM weapon_losses wl
                JOIN users uu ON uu.id = wl.user_id
                WHERE uu.discord_id = $1 AND wl.shift_id IN (SELECT id FROM participated)) AS total_losses
         FROM participated`,
        [discordId, guildId]
    );
    return rows[0] || null;
}

module.exports = { upsert, findByDiscordId, getStats };
