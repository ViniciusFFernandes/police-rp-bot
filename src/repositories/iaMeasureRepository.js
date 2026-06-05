const db = require('../database/pool');

async function nextMeasureNumber(guildId) {
    const year = new Date().getFullYear();
    const prefix = `MD-${year}-`;
    const { rows } = await db.query(
        `SELECT measure_number FROM ia_measures
         WHERE guild_id = $1 AND measure_number LIKE $2
         ORDER BY measure_number DESC LIMIT 1`,
        [guildId, `${prefix}%`]
    );
    if (rows.length === 0) return `${prefix}001`;
    const last = parseInt(rows[0].measure_number.replace(prefix, ''), 10);
    return `${prefix}${String(last + 1).padStart(3, '0')}`;
}

async function create(data) {
    const {
        guildId, measureNumber, type, targetDiscordId,
        appliedByDiscordId, duration, weaponSurrender, description,
    } = data;

    const { rows } = await db.query(
        `INSERT INTO ia_measures
         (guild_id, measure_number, type, target_discord_id,
          applied_by_discord_id, duration, weapon_surrender, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [guildId, measureNumber, type, targetDiscordId,
         appliedByDiscordId, duration ?? null, weaponSurrender, description]
    );
    return rows[0];
}

async function findById(id, guildId) {
    const { rows } = await db.query(
        'SELECT * FROM ia_measures WHERE id = $1 AND guild_id = $2',
        [id, guildId]
    );
    return rows[0] ?? null;
}

async function updateStatus(id, guildId, status) {
    const { rows } = await db.query(
        `UPDATE ia_measures SET status = $1, updated_at = NOW()
         WHERE id = $2 AND guild_id = $3 RETURNING *`,
        [status, id, guildId]
    );
    return rows[0] ?? null;
}

async function updateBoard(id, guildId, messageId, channelId) {
    await db.query(
        `UPDATE ia_measures SET board_message_id = $1, board_channel_id = $2, updated_at = NOW()
         WHERE id = $3 AND guild_id = $4`,
        [messageId, channelId, id, guildId]
    );
}

module.exports = { nextMeasureNumber, create, findById, updateStatus, updateBoard };
