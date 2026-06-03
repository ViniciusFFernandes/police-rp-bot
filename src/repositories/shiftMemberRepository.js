const db = require('../database/pool');

// Adiciona um participante à unidade. role: 'LEADER' | 'MEMBER'
async function add(client, shiftId, userId, role = 'MEMBER') {
    await (client || db).query(
        `INSERT INTO shift_members (shift_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (shift_id, user_id) DO NOTHING`,
        [shiftId, userId, role]
    );
}

// Lista todos os participantes da unidade (líder primeiro)
async function findByShift(shiftId) {
    const { rows } = await db.query(
        `SELECT sm.role, sm.joined_at, sm.user_id,
                u.discord_id, u.display_name, u.username
         FROM shift_members sm
         JOIN users u ON u.id = sm.user_id
         WHERE sm.shift_id = $1
         ORDER BY (sm.role = 'LEADER') DESC, sm.joined_at`,
        [shiftId]
    );
    return rows;
}

// Verifica se um usuário (por user_id interno) participa da unidade
async function isMember(shiftId, userId) {
    const { rows } = await db.query(
        'SELECT 1 FROM shift_members WHERE shift_id = $1 AND user_id = $2',
        [shiftId, userId]
    );
    return rows.length > 0;
}

module.exports = { add, findByShift, isMember };
