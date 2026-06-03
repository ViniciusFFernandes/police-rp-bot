const db = require('../database/pool');

async function create({ shiftId, userId, serialNumber, observation }) {
    const { rows } = await db.query(
        `INSERT INTO weapon_losses (shift_id, user_id, serial_number, observation)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [shiftId, userId, serialNumber, observation]
    );
    return rows[0];
}

async function existsInShift(shiftId, serialNumber) {
    const { rows } = await db.query(
        'SELECT id FROM weapon_losses WHERE shift_id = $1 AND serial_number = $2',
        [shiftId, serialNumber]
    );
    return rows.length > 0;
}

async function findBySerial(serialNumber, guildId) {
    const { rows } = await db.query(
        `SELECT wl.*, s.callsign, s.vehicle_prefix, s.started_at AS shift_started,
                u.discord_id, u.display_name
         FROM weapon_losses wl
         JOIN shifts s ON s.id = wl.shift_id
         JOIN users u ON u.id = wl.user_id
         WHERE wl.serial_number = $1 AND s.guild_id = $2
         ORDER BY wl.reported_at DESC`,
        [serialNumber, guildId]
    );
    return rows;
}

module.exports = { create, existsInShift, findBySerial };
