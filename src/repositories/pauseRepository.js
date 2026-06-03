const db = require('../database/pool');

async function create(shiftId) {
    const { rows } = await db.query(
        'INSERT INTO pauses (shift_id) VALUES ($1) RETURNING *',
        [shiftId]
    );
    return rows[0];
}

async function endActive(shiftId) {
    const { rows } = await db.query(
        `UPDATE pauses
         SET ended_at = NOW(),
             duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
         WHERE shift_id = $1 AND ended_at IS NULL
         RETURNING *`,
        [shiftId]
    );
    return rows[0] || null;
}

async function sumByShift(shiftId) {
    const { rows } = await db.query(
        'SELECT COALESCE(SUM(duration_ms), 0) AS total FROM pauses WHERE shift_id = $1 AND duration_ms IS NOT NULL',
        [shiftId]
    );
    return Number(rows[0].total);
}

async function findByShift(shiftId) {
    const { rows } = await db.query(
        'SELECT * FROM pauses WHERE shift_id = $1 ORDER BY started_at',
        [shiftId]
    );
    return rows;
}

module.exports = { create, endActive, sumByShift, findByShift };
