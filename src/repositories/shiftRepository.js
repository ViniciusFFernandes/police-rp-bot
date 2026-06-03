const db = require('../database/pool');

async function create(client, { userId, guildId, callsign, vehiclePrefix, weaponSerials }) {
    const { rows } = await (client || db).query(
        `INSERT INTO shifts (user_id, guild_id, callsign, vehicle_prefix, weapon_serials)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, guildId, callsign, vehiclePrefix, weaponSerials]
    );
    return rows[0];
}

async function findById(id) {
    const { rows } = await db.query(
        `SELECT s.*, array_agg(
            json_build_object('serial_number', wl.serial_number, 'observation', wl.observation, 'reported_at', wl.reported_at)
         ) FILTER (WHERE wl.id IS NOT NULL) AS weapon_losses
         FROM shifts s
         LEFT JOIN weapon_losses wl ON wl.shift_id = s.id
         WHERE s.id = $1
         GROUP BY s.id`,
        [id]
    );
    const row = rows[0];
    if (!row) return null;
    row.weapon_losses = row.weapon_losses || [];
    return row;
}

async function findActiveByUser(userId, guildId) {
    const { rows } = await db.query(
        `SELECT s.*, array_agg(
            json_build_object('serial_number', wl.serial_number, 'observation', wl.observation, 'reported_at', wl.reported_at)
         ) FILTER (WHERE wl.id IS NOT NULL) AS weapon_losses
         FROM shifts s
         LEFT JOIN weapon_losses wl ON wl.shift_id = s.id
         WHERE s.user_id = $1 AND s.guild_id = $2 AND s.status IN ('active', 'paused')
         GROUP BY s.id
         LIMIT 1`,
        [userId, guildId]
    );
    const row = rows[0];
    if (!row) return null;
    row.weapon_losses = row.weapon_losses || [];
    return row;
}

async function findByEmbedMessage(messageId, guildId) {
    const { rows } = await db.query(
        `SELECT s.*, u.discord_id AS user_discord_id,
                array_agg(
                    json_build_object('serial_number', wl.serial_number, 'observation', wl.observation, 'reported_at', wl.reported_at)
                ) FILTER (WHERE wl.id IS NOT NULL) AS weapon_losses
         FROM shifts s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN weapon_losses wl ON wl.shift_id = s.id
         WHERE s.embed_message_id = $1 AND s.guild_id = $2 AND s.status IN ('active', 'paused')
         GROUP BY s.id, u.discord_id`,
        [messageId, guildId]
    );
    const row = rows[0];
    if (!row) return null;
    row.weapon_losses = row.weapon_losses || [];
    return row;
}

async function updateEmbedMessage(id, messageId) {
    await db.query('UPDATE shifts SET embed_message_id = $1 WHERE id = $2', [messageId, id]);
}

async function updateVoiceChannel(id, channelId) {
    await db.query('UPDATE shifts SET voice_channel_id = $1 WHERE id = $2', [channelId, id]);
}

async function findEndedByUser(userId, guildId, limit = 10, offset = 0) {
    const { rows } = await db.query(
        `SELECT s.*,
                COUNT(p.id) AS pause_count,
                COALESCE(SUM(p.duration_ms), 0) AS total_pause_ms_calc,
                EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) * 1000 AS total_ms
         FROM shifts s
         LEFT JOIN pauses p ON p.shift_id = s.id
         WHERE s.user_id = $1 AND s.guild_id = $2 AND s.status = 'ended'
         GROUP BY s.id
         ORDER BY s.started_at DESC
         LIMIT $3 OFFSET $4`,
        [userId, guildId, limit, offset]
    );
    return rows;
}

async function countEndedByUser(userId, guildId) {
    const { rows } = await db.query(
        `SELECT COUNT(*) AS total FROM shifts WHERE user_id = $1 AND guild_id = $2 AND status = 'ended'`,
        [userId, guildId]
    );
    return Number(rows[0].total);
}

async function addWeaponSerial(id, serialNumber) {
    await db.query(
        'UPDATE shifts SET weapon_serials = array_append(weapon_serials, $1) WHERE id = $2',
        [serialNumber, id]
    );
}

async function updateStatus(id, status) {
    await db.query('UPDATE shifts SET status = $1 WHERE id = $2', [status, id]);
}

async function end(id, totalPauseMs) {
    const { rows } = await db.query(
        `UPDATE shifts
         SET status = 'ended', ended_at = NOW(), total_pause_ms = $1
         WHERE id = $2
         RETURNING *`,
        [totalPauseMs, id]
    );
    return rows[0];
}

module.exports = {
    create,
    findById,
    findActiveByUser,
    findByEmbedMessage,
    findEndedByUser,
    countEndedByUser,
    updateEmbedMessage,
    updateVoiceChannel,
    updateStatus,
    addWeaponSerial,
    end,
};
