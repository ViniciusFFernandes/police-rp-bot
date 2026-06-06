const db = require('../database/pool');

async function upsert(userId, guildId, district, callsignNum, badgeNum = null) {
    const { rows } = await db.query(
        `INSERT INTO official_profiles (user_id, guild_id, district, callsign_num, badge_num)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, guild_id) DO UPDATE
         SET district = EXCLUDED.district, callsign_num = EXCLUDED.callsign_num,
             badge_num = EXCLUDED.badge_num
         RETURNING *`,
        [userId, guildId, district.trim().toUpperCase(), callsignNum.trim(), badgeNum ? badgeNum.trim() : null]
    );
    return rows[0];
}

async function findByUser(userId, guildId) {
    const { rows } = await db.query(
        `SELECT op.*, u.discord_id, u.display_name
         FROM official_profiles op
         JOIN users u ON u.id = op.user_id
         WHERE op.user_id = $1 AND op.guild_id = $2`,
        [userId, guildId]
    );
    return rows[0] || null;
}

async function findByDiscordId(discordId, guildId) {
    const { rows } = await db.query(
        `SELECT op.*, u.discord_id, u.display_name
         FROM official_profiles op
         JOIN users u ON u.id = op.user_id
         WHERE u.discord_id = $1 AND op.guild_id = $2`,
        [discordId, guildId]
    );
    return rows[0] || null;
}

// Todos os perfis do servidor, ordenados por distrito e callsign
async function findAllByGuild(guildId) {
    const { rows } = await db.query(
        `SELECT op.district, op.callsign_num, op.badge_num, op.updated_at,
                u.discord_id, u.display_name
         FROM official_profiles op
         JOIN users u ON u.id = op.user_id
         WHERE op.guild_id = $1
         ORDER BY op.district, op.callsign_num`,
        [guildId]
    );
    return rows;
}

async function remove(userId, guildId) {
    const { rowCount } = await db.query(
        `DELETE FROM official_profiles WHERE user_id = $1 AND guild_id = $2`,
        [userId, guildId]
    );
    return rowCount > 0;
}

module.exports = { upsert, findByUser, findByDiscordId, findAllByGuild, remove };
