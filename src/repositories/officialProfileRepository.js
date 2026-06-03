const db = require('../database/pool');

async function upsert(userId, guildId, district, callsignNum) {
    const { rows } = await db.query(
        `INSERT INTO official_profiles (user_id, guild_id, district, callsign_num)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, guild_id) DO UPDATE
         SET district = EXCLUDED.district, callsign_num = EXCLUDED.callsign_num
         RETURNING *`,
        [userId, guildId, district.trim().toUpperCase(), callsignNum.trim()]
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

module.exports = { upsert, findByUser, findByDiscordId };
