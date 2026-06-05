// Armazenamento temporário do fluxo de abertura de relatório de serviço (multi-etapa).
// Chaveado por (guild, usuário). TTL de 15 minutos.

const TTL_MS = 15 * 60 * 1000;
const store = new Map();

function key(guildId, userId) { return `${guildId}:${userId}`; }

function _get(guildId, userId) {
    const k = key(guildId, userId);
    const e = store.get(k);
    if (!e) return null;
    if (Date.now() - e.ts > TTL_MS) { store.delete(k); return null; }
    return e;
}

function _ensure(guildId, userId) {
    const e = _get(guildId, userId);
    if (e) { e.ts = Date.now(); return e; }
    const fresh = {
        type: null, involvedDiscordIds: [],
        incidentLocation: null, incidentDate: null, incidentTime: null,
        description: null, suspects: null, seizedItems: null, evidence: null,
        collectionMsgId: null, provasChannelId: null, reservedReportNumber: null,
        ts: Date.now(),
    };
    store.set(key(guildId, userId), fresh);
    return fresh;
}

function setStep1(guildId, userId, type, involvedDiscordIds) {
    const e = _ensure(guildId, userId);
    e.type = type;
    e.involvedDiscordIds = involvedDiscordIds ?? [];
}

function setStep2(guildId, userId, fields) {
    const e = _ensure(guildId, userId);
    Object.assign(e, fields);
}

function get(guildId, userId) {
    const e = _get(guildId, userId);
    if (!e) return null;
    const { ts, ...data } = e;
    return data;
}

function clear(guildId, userId) { store.delete(key(guildId, userId)); }

const interval = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) {
        if (now - v.ts > TTL_MS) store.delete(k);
    }
}, 5 * 60 * 1000);
if (interval.unref) interval.unref();

module.exports = { setStep1, setStep2, get, clear };
