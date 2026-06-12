const db = require('../database/pool');

async function create(guildId, discordId, displayName) {
    const { rows } = await db.query(
        `INSERT INTO hospital_shifts (guild_id, discord_id, display_name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [guildId, discordId, displayName]
    );
    return rows[0];
}

async function findById(shiftId) {
    const { rows } = await db.query(
        'SELECT * FROM hospital_shifts WHERE id = $1',
        [shiftId]
    );
    return rows[0] ?? null;
}

async function findActiveByUser(discordId, guildId) {
    const { rows } = await db.query(
        `SELECT * FROM hospital_shifts
         WHERE discord_id = $1 AND guild_id = $2 AND status IN ('active', 'paused')
         ORDER BY started_at DESC LIMIT 1`,
        [discordId, guildId]
    );
    return rows[0] ?? null;
}

async function findAllActiveByGuild(guildId) {
    const { rows } = await db.query(
        `SELECT * FROM hospital_shifts
         WHERE guild_id = $1 AND status IN ('active', 'paused')
         ORDER BY started_at ASC`,
        [guildId]
    );
    return rows;
}

async function updateStatus(shiftId, status) {
    await db.query(
        'UPDATE hospital_shifts SET status = $1 WHERE id = $2',
        [status, shiftId]
    );
}

async function updateEmbedMessage(shiftId, messageId) {
    await db.query(
        'UPDATE hospital_shifts SET embed_message_id = $1 WHERE id = $2',
        [messageId, shiftId]
    );
}

async function end(shiftId, totalPauseMs, endedBy = null) {
    const { rows } = await db.query(
        `UPDATE hospital_shifts
         SET status = 'ended', ended_at = NOW(), total_pause_ms = $1, ended_by = $2
         WHERE id = $3
         RETURNING *`,
        [totalPauseMs, endedBy, shiftId]
    );
    return rows[0];
}

async function findEndedByUser(discordId, guildId, limit = 10, offset = 0) {
    const { rows } = await db.query(
        `SELECT hs.*,
                (EXTRACT(EPOCH FROM (hs.ended_at - hs.started_at)) * 1000)::BIGINT AS total_ms,
                (SELECT COUNT(*) FROM hospital_pauses hp WHERE hp.shift_id = hs.id) AS pause_count
         FROM hospital_shifts hs
         WHERE hs.discord_id = $1 AND hs.guild_id = $2 AND hs.status = 'ended'
         ORDER BY hs.ended_at DESC
         LIMIT $3 OFFSET $4`,
        [discordId, guildId, limit, offset]
    );
    return rows;
}

async function countEndedByUser(discordId, guildId) {
    const { rows } = await db.query(
        `SELECT COUNT(*) AS total FROM hospital_shifts
         WHERE discord_id = $1 AND guild_id = $2 AND status = 'ended'`,
        [discordId, guildId]
    );
    return parseInt(rows[0].total, 10);
}

// ── Pausas ──────────────────────────────────────────────────────────────────

async function createPause(shiftId) {
    await db.query(
        'INSERT INTO hospital_pauses (shift_id) VALUES ($1)',
        [shiftId]
    );
}

async function endActivePause(shiftId) {
    await db.query(
        `UPDATE hospital_pauses
         SET ended_at = NOW(),
             duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
         WHERE shift_id = $1 AND ended_at IS NULL`,
        [shiftId]
    );
}

async function sumPauses(shiftId) {
    const { rows } = await db.query(
        `SELECT COALESCE(SUM(duration_ms), 0) AS total FROM hospital_pauses
         WHERE shift_id = $1 AND duration_ms IS NOT NULL`,
        [shiftId]
    );
    return parseInt(rows[0].total, 10);
}

async function countPauses(shiftId) {
    const { rows } = await db.query(
        'SELECT COUNT(*) AS total FROM hospital_pauses WHERE shift_id = $1',
        [shiftId]
    );
    return parseInt(rows[0].total, 10);
}

async function getStats(discordId, guildId) {
    const { rows } = await db.query(
        `SELECT
            COUNT(*) AS total_shifts,
            COALESCE(SUM(
                EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000
                - total_pause_ms
            ), 0)::BIGINT AS effective_ms,
            COALESCE(SUM(total_pause_ms), 0)::BIGINT AS total_pause_ms,
            (SELECT COUNT(*) FROM hospital_pauses hp
             JOIN hospital_shifts hs2 ON hp.shift_id = hs2.id
             WHERE hs2.discord_id = $1 AND hs2.guild_id = $2 AND hs2.status = 'ended'
            ) AS total_pauses
         FROM hospital_shifts
         WHERE discord_id = $1 AND guild_id = $2 AND status = 'ended'`,
        [discordId, guildId]
    );
    return rows[0];
}

module.exports = {
    create,
    findById,
    findActiveByUser,
    findAllActiveByGuild,
    updateStatus,
    updateEmbedMessage,
    end,
    findEndedByUser,
    countEndedByUser,
    createPause,
    endActivePause,
    sumPauses,
    countPauses,
    getStats,
};
