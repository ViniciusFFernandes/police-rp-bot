const db = require('../database/pool');

async function register(userId, guildId, weaponName, serialNumber) {
    const { rows } = await db.query(
        `INSERT INTO official_weapons (user_id, guild_id, weapon_name, serial_number)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (guild_id, serial_number) DO UPDATE
         SET weapon_name = EXCLUDED.weapon_name, user_id = EXCLUDED.user_id
         RETURNING *`,
        [userId, guildId, weaponName, serialNumber]
    );
    return rows[0];
}

async function findByUser(userId, guildId, { excludeLost = false } = {}) {
    const { rows } = await db.query(
        `SELECT ow.*, COALESCE(w.status, 'available') AS status
         FROM official_weapons ow
         LEFT JOIN weapons w ON w.serial_number = ow.serial_number AND w.guild_id = ow.guild_id
         WHERE ow.user_id = $1 AND ow.guild_id = $2
         ${excludeLost ? "AND COALESCE(w.status, 'available') != 'lost'" : ''}
         ORDER BY ow.created_at`,
        [userId, guildId]
    );
    return rows;
}

async function findBySerial(guildId, serialNumber) {
    const { rows } = await db.query(
        `SELECT ow.*, u.discord_id, u.display_name
         FROM official_weapons ow
         JOIN users u ON u.id = ow.user_id
         WHERE ow.guild_id = $1 AND ow.serial_number = $2`,
        [guildId, serialNumber]
    );
    return rows[0] || null;
}

async function remove(userId, guildId, serialNumber) {
    const { rowCount } = await db.query(
        'DELETE FROM official_weapons WHERE user_id = $1 AND guild_id = $2 AND serial_number = $3',
        [userId, guildId, serialNumber]
    );
    return rowCount > 0;
}

async function getArsenalHistory(userId, guildId) {
    const { rows } = await db.query(
        `SELECT
            ow.weapon_name,
            ow.serial_number,
            ow.created_at AS registered_at,
            COALESCE(w.status, 'available') AS status,
            COUNT(DISTINCT s.id) AS times_used,
            COUNT(DISTINCT wl.id) AS times_lost,
            MAX(s.started_at) AS last_used_at
         FROM official_weapons ow
         LEFT JOIN weapons w ON w.serial_number = ow.serial_number AND w.guild_id = ow.guild_id
         LEFT JOIN shift_members sm ON sm.user_id = ow.user_id
         LEFT JOIN shifts s ON s.id = sm.shift_id AND ow.serial_number = ANY(s.weapon_serials) AND s.guild_id = ow.guild_id
         LEFT JOIN weapon_losses wl ON wl.serial_number = ow.serial_number AND wl.user_id = ow.user_id
         WHERE ow.user_id = $1 AND ow.guild_id = $2
         GROUP BY ow.weapon_name, ow.serial_number, ow.created_at, w.status
         ORDER BY ow.created_at`,
        [userId, guildId]
    );
    return rows;
}

module.exports = { register, findByUser, findBySerial, remove, getArsenalHistory };
