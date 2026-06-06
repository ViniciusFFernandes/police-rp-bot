const db = require('../database/pool');

async function nextWarningNumber(guildId) {
    const year = new Date().getFullYear();
    const prefix = `ADV-${year}-`;
    const { rows } = await db.query(
        `SELECT warning_number FROM traffic_warnings
         WHERE guild_id = $1 AND warning_number LIKE $2
         ORDER BY warning_number DESC LIMIT 1`,
        [guildId, `${prefix}%`]
    );
    if (rows.length === 0) return `${prefix}001`;
    const last = parseInt(rows[0].warning_number.replace(prefix, ''), 10);
    return `${prefix}${String(last + 1).padStart(3, '0')}`;
}

async function create(data) {
    const {
        guildId, warningNumber, condutorName, citizenId, plate, deadline,
        infractions, description, registeredByDiscordId,
    } = data;

    const { rows } = await db.query(
        `INSERT INTO traffic_warnings
         (guild_id, warning_number, condutor_name, citizen_id, plate, deadline,
          infractions, description, registered_by_discord_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
            guildId, warningNumber, condutorName, citizenId,
            plate || null, deadline || null,
            infractions, description || null, registeredByDiscordId,
        ]
    );
    return rows[0];
}

async function search(guildId, { citizenId = null, plate = null } = {}) {
    const params = [guildId];
    let where = 'WHERE guild_id = $1';
    if (citizenId) { params.push(`%${citizenId}%`); where += ` AND citizen_id ILIKE $${params.length}`; }
    if (plate)     { params.push(`%${plate}%`);     where += ` AND plate ILIKE $${params.length}`; }

    const { rows } = await db.query(
        `SELECT * FROM traffic_warnings ${where} ORDER BY created_at DESC LIMIT 25`,
        params
    );
    return rows;
}

module.exports = { nextWarningNumber, create, search };
