const db = require('../database/pool');

const VALID_KEYS = [
    'shift_channel_id',
    'report_channel_id',
    'weapon_report_channel_id',
    'voice_category_id',
    'supervisor_role_ids',
    'config_manager_role_ids',
    'callsign_channel_id',
    'callsign_message_id',   // interno — ID da mensagem persistente do quadro
    'ia_channel_id',
    'ia_category_id',
    'ia_evidence_channel_id',
    'ia_role_ids',
    'police_role_ids',
    'panel_channel_id',
    'panel_message_id',         // interno — ID da mensagem persistente do painel
    'admin_panel_channel_id',
    'admin_panel_message_id',   // interno — ID da mensagem persistente do painel admin
    'ia_panel_channel_id',
    'ia_panel_message_id',      // interno — ID da mensagem persistente do painel de IA
    'sr_channel_id',            // canal onde os relatórios de serviço são publicados
    'sr_evidence_channel_id',   // canal de arquivo de provas de serviço
    'sr_category_id',           // categoria para canais temporários de provas de SR
    'ia_measures_channel_id',   // canal onde alertas de medidas disciplinares são enviados
    'civil_panel_channel_id',
    'civil_panel_message_id',
    'civil_complaints_channel_id',
    'civil_complaints_category_id',
    'civil_evidence_channel_id',
    'traffic_warnings_channel_id',
    'announcements_channel_id',
    'citizen_role_ids',
];

async function get(guildId, key) {
    const { rows } = await db.query(
        'SELECT value FROM guild_config WHERE guild_id = $1 AND key = $2',
        [guildId, key]
    );
    return rows[0]?.value ?? null;
}

async function set(guildId, key, value) {
    if (!VALID_KEYS.includes(key)) {
        throw new Error(`Chave de configuração inválida: ${key}`);
    }
    await db.query(
        `INSERT INTO guild_config (guild_id, key, value)
         VALUES ($1, $2, $3)
         ON CONFLICT (guild_id, key) DO UPDATE SET value = EXCLUDED.value`,
        [guildId, key, value]
    );
}

async function getAll(guildId) {
    const { rows } = await db.query(
        'SELECT key, value FROM guild_config WHERE guild_id = $1',
        [guildId]
    );
    const map = Object.fromEntries(VALID_KEYS.map(k => [k, null]));
    for (const row of rows) map[row.key] = row.value;
    return map;
}

async function isConfigured(guildId) {
    const cfg = await getAll(guildId);
    return (
        !!cfg.shift_channel_id &&
        !!cfg.report_channel_id &&
        !!cfg.weapon_report_channel_id &&
        !!cfg.voice_category_id
    );
}

async function getSupervisorRoles(guildId) {
    const raw = await get(guildId, 'supervisor_role_ids');
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

async function setSupervisorRoles(guildId, roleIds) {
    await set(guildId, 'supervisor_role_ids', JSON.stringify(roleIds));
}

async function getConfigManagerRoles(guildId) {
    const raw = await get(guildId, 'config_manager_role_ids');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
}

async function setConfigManagerRoles(guildId, roleIds) {
    await set(guildId, 'config_manager_role_ids', JSON.stringify(roleIds));
}

async function getIARoles(guildId) {
    const raw = await get(guildId, 'ia_role_ids');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
}

async function setIARoles(guildId, roleIds) {
    await set(guildId, 'ia_role_ids', JSON.stringify(roleIds));
}

async function getPoliceRoles(guildId) {
    const raw = await get(guildId, 'police_role_ids');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
}

async function setPoliceRoles(guildId, roleIds) {
    await set(guildId, 'police_role_ids', JSON.stringify(roleIds));
}

async function getCitizenRoles(guildId) {
    const raw = await get(guildId, 'citizen_role_ids');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
}

async function setCitizenRoles(guildId, roleIds) {
    await set(guildId, 'citizen_role_ids', JSON.stringify(roleIds));
}

module.exports = {
    get, set, getAll, isConfigured,
    getSupervisorRoles, setSupervisorRoles,
    getConfigManagerRoles, setConfigManagerRoles,
    getIARoles, setIARoles,
    getPoliceRoles, setPoliceRoles,
    getCitizenRoles, setCitizenRoles,
    VALID_KEYS,
};
