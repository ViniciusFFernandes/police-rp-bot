// Armazenamento temporário dos filtros de consulta de relatórios de serviço.
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
    const existing = get(guildId, userId) || { type: null, involvedDiscordId: null, status: null };
    const updated = { ...existing, ...fields, ts: Date.now() };
    store.set(k, updated);
    return updated;
}

function clear(guildId, userId) {
    store.delete(key(guildId, userId));
}

module.exports = { get, set, clear };
