const db = require('../database/pool');

async function register(guildId, name) {
    const { rows } = await db.query(
        `INSERT INTO units (guild_id, name)
         VALUES ($1, $2)
         ON CONFLICT (guild_id, name) DO UPDATE SET is_active = TRUE
         RETURNING *`,
        [guildId, name.trim().toUpperCase()]
    );
    return rows[0];
}

async function findActive(guildId) {
    const { rows } = await db.query(
        `SELECT * FROM units WHERE guild_id = $1 AND is_active = TRUE ORDER BY name`,
        [guildId]
    );
    return rows;
}

async function findAll(guildId) {
    const { rows } = await db.query(
        `SELECT * FROM units WHERE guild_id = $1 ORDER BY is_active DESC, name`,
        [guildId]
    );
    return rows;
}

async function deactivate(guildId, name) {
    const { rowCount } = await db.query(
        `UPDATE units SET is_active = FALSE WHERE guild_id = $1 AND name = $2`,
        [guildId, name.trim().toUpperCase()]
    );
    return rowCount > 0;
}

module.exports = { register, findActive, findAll, deactivate };
