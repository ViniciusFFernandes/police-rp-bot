const db = require('../database/pool');

async function get(key) {
    const { rows } = await db.query('SELECT value FROM bot_config WHERE key = $1', [key]);
    return rows[0]?.value ?? null;
}

async function set(key, value) {
    await db.query(
        `INSERT INTO bot_config (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value]
    );
}

async function getAll() {
    const { rows } = await db.query('SELECT key, value FROM bot_config');
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

module.exports = { get, set, getAll };
