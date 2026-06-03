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

async function getStats(discordId, guildId) {
    const { rows } = await db.query(
        `SELECT
            u.discord_id,
            u.display_name,
            COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'ended') AS total_shifts,
            COALESCE(SUM(
                EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) * 1000 - s.total_pause_ms
            ) FILTER (WHERE s.status = 'ended'), 0) AS effective_ms,
            COALESCE(SUM(s.total_pause_ms) FILTER (WHERE s.status = 'ended'), 0) AS total_pause_ms,
            COUNT(DISTINCT p.id) AS total_pauses,
            COUNT(DISTINCT wl.id) AS total_losses
         FROM users u
         LEFT JOIN shifts s ON s.user_id = u.id AND s.guild_id = $2
         LEFT JOIN pauses p ON p.shift_id = s.id
         LEFT JOIN weapon_losses wl ON wl.user_id = u.id AND wl.shift_id = s.id
         WHERE u.discord_id = $1
         GROUP BY u.discord_id, u.display_name`,
        [discordId, guildId]
    );
    return rows[0] || null;
}

module.exports = { upsert, findByDiscordId, getStats };
