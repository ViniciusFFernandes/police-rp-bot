const db = require('../database/pool');

async function upsert(serialNumber, guildId) {
    const { rows } = await db.query(
        `INSERT INTO weapons (serial_number, guild_id) VALUES ($1, $2)
         ON CONFLICT (serial_number, guild_id) DO NOTHING
         RETURNING *`,
        [serialNumber, guildId]
    );
    return rows[0];
}

async function findBySerial(serialNumber, guildId) {
    const { rows } = await db.query(
        `SELECT w.*, u.discord_id AS last_discord_id, u.display_name AS last_user_name,
                s.callsign AS last_callsign, s.started_at AS last_shift_started
         FROM weapons w
         LEFT JOIN users u ON u.id = w.last_user_id
         LEFT JOIN shifts s ON s.id = w.last_shift_id
         WHERE w.serial_number = $1 AND w.guild_id = $2`,
        [serialNumber, guildId]
    );
    return rows[0] || null;
}

async function setInUse(serialNumber, guildId, userId, shiftId) {
    await db.query(
        `UPDATE weapons SET status = 'in_use', last_user_id = $3, last_shift_id = $4
         WHERE serial_number = $1 AND guild_id = $2`,
        [serialNumber, guildId, userId, shiftId]
    );
}

async function setLost(serialNumber, guildId) {
    await db.query(
        "UPDATE weapons SET status = 'lost' WHERE serial_number = $1 AND guild_id = $2",
        [serialNumber, guildId]
    );
}

async function setAvailable(serialNumber, guildId) {
    await db.query(
        "UPDATE weapons SET status = 'available' WHERE serial_number = $1 AND guild_id = $2",
        [serialNumber, guildId]
    );
}

module.exports = { upsert, findBySerial, setInUse, setLost, setAvailable };
