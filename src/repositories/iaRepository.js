const db = require('../database/pool');

async function nextCaseNumber(guildId) {
    const year = new Date().getFullYear();
    const prefix = `IA-${year}-`;
    const { rows } = await db.query(
        `SELECT case_number FROM ia_investigations
         WHERE guild_id = $1 AND case_number LIKE $2
         ORDER BY case_number DESC LIMIT 1`,
        [guildId, `${prefix}%`]
    );
    if (rows.length === 0) return `${prefix}001`;
    const last = parseInt(rows[0].case_number.replace(prefix, ''), 10);
    return `${prefix}${String(last + 1).padStart(3, '0')}`;
}

async function create(data) {
    const {
        guildId, caseNumber, origin,
        openedByDiscordId, involvedDiscordId,
        involvedCallsign, involvedBadge, involvedDistrict,
        additionalInvolvedIds,
        radioVehicle, incidentDate, incidentTime,
        incidentLocation, classification, complainantId,
        description, evidence,
    } = data;

    const { rows } = await db.query(
        `INSERT INTO ia_investigations
         (guild_id, case_number, origin, opened_by_discord_id,
          involved_discord_id, involved_callsign, involved_badge, involved_district,
          additional_involved_ids,
          radio_vehicle, incident_date, incident_time, incident_location,
          classification, complainant_id, description, evidence)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
            guildId, caseNumber, origin, openedByDiscordId,
            involvedDiscordId, involvedCallsign || null, involvedBadge || null, involvedDistrict || null,
            additionalInvolvedIds ? JSON.stringify(additionalInvolvedIds) : null,
            radioVehicle || null, incidentDate || null, incidentTime || null, incidentLocation || null,
            classification || null, complainantId || null, description || null, evidence || null,
        ]
    );
    return rows[0];
}

async function findById(id, guildId) {
    const { rows } = await db.query(
        'SELECT * FROM ia_investigations WHERE id = $1 AND guild_id = $2',
        [id, guildId]
    );
    return rows[0] || null;
}

async function updateBoard(id, boardMessageId, boardChannelId) {
    await db.query(
        'UPDATE ia_investigations SET board_message_id = $1, board_channel_id = $2 WHERE id = $3',
        [boardMessageId, boardChannelId, id]
    );
}

async function updateStatus(id, guildId, status) {
    await db.query(
        'UPDATE ia_investigations SET status = $1 WHERE id = $2 AND guild_id = $3',
        [status, id, guildId]
    );
}

async function close(id, guildId, verdict, penaltyRecommendation) {
    await db.query(
        `UPDATE ia_investigations
         SET status = 'closed', closure_verdict = $1, penalty_recommendation = $2
         WHERE id = $3 AND guild_id = $4`,
        [verdict, penaltyRecommendation, id, guildId]
    );
}

async function updatePenaltyStatus(id, guildId, penaltyStatus) {
    await db.query(
        'UPDATE ia_investigations SET penalty_status = $1 WHERE id = $2 AND guild_id = $3',
        [penaltyStatus, id, guildId]
    );
}

async function findByCaseNumber(caseNumber, guildId) {
    const { rows } = await db.query(
        'SELECT * FROM ia_investigations WHERE UPPER(case_number) = UPPER($1) AND guild_id = $2',
        [caseNumber, guildId]
    );
    return rows[0] || null;
}

async function remove(id, guildId) {
    await db.query('DELETE FROM ia_investigations WHERE id = $1 AND guild_id = $2', [id, guildId]);
}

async function listByGuild(guildId, { status = null, involvedDiscordId = null } = {}) {
    const params = [guildId];
    let where = 'WHERE guild_id = $1';
    if (status) { params.push(status); where += ` AND status = $${params.length}`; }
    if (involvedDiscordId) { params.push(involvedDiscordId); where += ` AND involved_discord_id = $${params.length}`; }
    const { rows } = await db.query(
        `SELECT * FROM ia_investigations ${where} ORDER BY opened_at DESC`,
        params
    );
    return rows;
}

async function updateAdditionalAccused(id, guildId, ids) {
    await db.query(
        'UPDATE ia_investigations SET additional_involved_ids = $1 WHERE id = $2 AND guild_id = $3',
        [ids && ids.length ? JSON.stringify(ids) : null, id, guildId]
    );
}

async function updateDescription(id, guildId, description) {
    await db.query(
        'UPDATE ia_investigations SET description = $1 WHERE id = $2 AND guild_id = $3',
        [description, id, guildId]
    );
}

async function appendEvidence(id, guildId, newEvidence) {
    const inv = await findById(id, guildId);
    const existing = inv?.evidence || '';
    const updated = existing ? `${existing}\n${newEvidence}` : newEvidence;
    await db.query(
        'UPDATE ia_investigations SET evidence = $1 WHERE id = $2 AND guild_id = $3',
        [updated, id, guildId]
    );
    return updated;
}

module.exports = { nextCaseNumber, create, findById, findByCaseNumber, remove, updateBoard, updateStatus, close, updatePenaltyStatus, listByGuild, updateAdditionalAccused, updateDescription, appendEvidence };
