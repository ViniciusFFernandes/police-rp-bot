// Armazenamento temporário do fluxo de denúncia civil (entre o modal e a coleta de provas).
// Chaveado por (guild, usuário). TTL de 15 minutos.

const TTL_MS = 15 * 60 * 1000;
const store = new Map();

function key(guildId, userId) { return `${guildId}:${userId}`; }

function get(guildId, userId) {
    const k = key(guildId, userId);
    const e = store.get(k);
    if (!e) return null;
    if (Date.now() - e.ts > TTL_MS) { store.delete(k); return null; }
    return e;
}

function set(guildId, userId, fields) {
    const k = key(guildId, userId);
    const existing = get(guildId, userId) || {
        isAnonymous: false, complainantName: null, subject: null, description: null,
        collectionMsgId: null, provasChannelId: null, reservedComplaintNumber: null,
    };
    const updated = { ...existing, ...fields, ts: Date.now() };
    store.set(k, updated);
    return updated;
}

function clear(guildId, userId) {
    store.delete(key(guildId, userId));
}

module.exports = { get, set, clear };
