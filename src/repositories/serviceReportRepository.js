const db = require('../database/pool');

async function nextReportNumber(guildId) {
    const year   = new Date().getFullYear();
    const prefix = `SR-${year}-`;
    const { rows } = await db.query(
        `SELECT report_number FROM service_reports
         WHERE guild_id = $1 AND report_number LIKE $2
         ORDER BY report_number DESC LIMIT 1`,
        [guildId, `${prefix}%`]
    );
    if (rows.length === 0) return `${prefix}001`;
    const last = parseInt(rows[0].report_number.replace(prefix, ''), 10);
    return `${prefix}${String(last + 1).padStart(3, '0')}`;
}

async function create(data) {
    const {
        guildId, reportNumber, type, openedByDiscordId,
        involvedDiscordIds,
        incidentLocation, incidentDate, incidentTime,
        description, suspects, seizedItems, evidence,
    } = data;

    const { rows } = await db.query(
        `INSERT INTO service_reports
         (guild_id, report_number, type, opened_by_discord_id, involved_discord_ids,
          incident_location, incident_date, incident_time,
          description, suspects, seized_items, evidence)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
            guildId, reportNumber, type, openedByDiscordId,
            JSON.stringify(involvedDiscordIds),
            incidentLocation || null, incidentDate || null, incidentTime || null,
            description || null, suspects || null, seizedItems || null, evidence || null,
        ]
    );
    return rows[0];
}

async function findById(id, guildId) {
    const { rows } = await db.query(
        'SELECT * FROM service_reports WHERE id = $1 AND guild_id = $2',
        [id, guildId]
    );
    return rows[0] || null;
}

async function findByReportNumber(reportNumber, guildId) {
    const { rows } = await db.query(
        'SELECT * FROM service_reports WHERE UPPER(report_number) = UPPER($1) AND guild_id = $2',
        [reportNumber, guildId]
    );
    return rows[0] || null;
}

async function updateBoard(id, boardMessageId, boardChannelId) {
    await db.query(
        'UPDATE service_reports SET board_message_id = $1, board_channel_id = $2 WHERE id = $3',
        [boardMessageId, boardChannelId, id]
    );
}

async function updateStatus(id, guildId, status) {
    await db.query(
        'UPDATE service_reports SET status = $1 WHERE id = $2 AND guild_id = $3',
        [status, id, guildId]
    );
}

async function updateInvolvedOfficers(id, guildId, involvedDiscordIds) {
    await db.query(
        'UPDATE service_reports SET involved_discord_ids = $1 WHERE id = $2 AND guild_id = $3',
        [JSON.stringify(involvedDiscordIds), id, guildId]
    );
}

async function updateDescription(id, guildId, description) {
    await db.query(
        'UPDATE service_reports SET description = $1 WHERE id = $2 AND guild_id = $3',
        [description, id, guildId]
    );
}

async function appendEvidence(id, guildId, newEvidence) {
    const inv      = await findById(id, guildId);
    const existing = inv?.evidence || '';
    const updated  = existing ? `${existing}\n${newEvidence}` : newEvidence;
    await db.query(
        'UPDATE service_reports SET evidence = $1 WHERE id = $2 AND guild_id = $3',
        [updated, id, guildId]
    );
    return updated;
}

async function remove(id, guildId) {
    await db.query('DELETE FROM service_reports WHERE id = $1 AND guild_id = $2', [id, guildId]);
}

async function listByGuild(guildId, { status = null, type = null, openedByDiscordId = null, involvedDiscordId = null } = {}) {
    const params = [guildId];
    let where = 'WHERE guild_id = $1';
    if (status)             { params.push(status);             where += ` AND status = $${params.length}`; }
    if (type)               { params.push(type);               where += ` AND type = $${params.length}`; }
    if (openedByDiscordId)  { params.push(openedByDiscordId);  where += ` AND opened_by_discord_id = $${params.length}`; }
    if (involvedDiscordId)  { params.push(`%"${involvedDiscordId}"%`); where += ` AND involved_discord_ids LIKE $${params.length}`; }
    const { rows } = await db.query(
        `SELECT * FROM service_reports ${where} ORDER BY opened_at DESC`,
        params
    );
    return rows;
}

module.exports = {
    nextReportNumber, create, findById, findByReportNumber, remove,
    updateBoard, updateStatus, updateInvolvedOfficers, updateDescription, appendEvidence,
    listByGuild,
};
