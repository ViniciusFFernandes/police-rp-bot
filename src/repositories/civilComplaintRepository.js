const db = require('../database/pool');

async function nextComplaintNumber(guildId) {
    const year = new Date().getFullYear();
    const prefix = `DC-${year}-`;
    const { rows } = await db.query(
        `SELECT complaint_number FROM civil_complaints
         WHERE guild_id = $1 AND complaint_number LIKE $2
         ORDER BY complaint_number DESC LIMIT 1`,
        [guildId, `${prefix}%`]
    );
    if (rows.length === 0) return `${prefix}001`;
    const last = parseInt(rows[0].complaint_number.replace(prefix, ''), 10);
    return `${prefix}${String(last + 1).padStart(3, '0')}`;
}

async function create(data) {
    const {
        guildId, complaintNumber, isAnonymous,
        complainantDiscordId, complainantName,
        subject, description, evidence,
    } = data;

    const { rows } = await db.query(
        `INSERT INTO civil_complaints
         (guild_id, complaint_number, is_anonymous, complainant_discord_id, complainant_name,
          subject, description, evidence)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
            guildId, complaintNumber, isAnonymous,
            complainantDiscordId || null, complainantName || null,
            subject || null, description || null, evidence || null,
        ]
    );
    return rows[0];
}

async function findById(id, guildId) {
    const { rows } = await db.query(
        'SELECT * FROM civil_complaints WHERE id = $1 AND guild_id = $2',
        [id, guildId]
    );
    return rows[0] || null;
}

async function findByComplaintNumber(complaintNumber, guildId) {
    const { rows } = await db.query(
        'SELECT * FROM civil_complaints WHERE UPPER(complaint_number) = UPPER($1) AND guild_id = $2',
        [complaintNumber, guildId]
    );
    return rows[0] || null;
}

async function listByComplainant(guildId, complainantDiscordId) {
    const { rows } = await db.query(
        `SELECT * FROM civil_complaints
         WHERE guild_id = $1 AND complainant_discord_id = $2
         ORDER BY created_at DESC`,
        [guildId, complainantDiscordId]
    );
    return rows;
}

async function updateBoard(id, boardMessageId, boardChannelId) {
    await db.query(
        'UPDATE civil_complaints SET board_message_id = $1, board_channel_id = $2 WHERE id = $3',
        [boardMessageId, boardChannelId, id]
    );
}

async function review(id, guildId, status, reviewedByDiscordId, reviewNote) {
    const { rows } = await db.query(
        `UPDATE civil_complaints
         SET status = $1, reviewed_by_discord_id = $2, review_note = $3, reviewed_at = NOW()
         WHERE id = $4 AND guild_id = $5
         RETURNING *`,
        [status, reviewedByDiscordId, reviewNote || null, id, guildId]
    );
    return rows[0] || null;
}

module.exports = {
    nextComplaintNumber,
    create,
    findById,
    findByComplaintNumber,
    listByComplainant,
    updateBoard,
    review,
};
