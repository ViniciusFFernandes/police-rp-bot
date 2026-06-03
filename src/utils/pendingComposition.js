// Armazena temporariamente os dados de composição da unidade entre interações
// (seleção de viatura, seleção de membros, confirmação).
// Chaveado por (guild, ator) — não há colisão entre usuários.

const TTL_MS = 10 * 60 * 1000; // 10 minutos
const store = new Map();

function key(guildId, userId) {
    return `${guildId}:${userId}`;
}

function _ensure(guildId, userId) {
    const k = key(guildId, userId);
    if (!store.has(k)) store.set(k, { memberIds: [], vehicle: null, ts: Date.now() });
    const entry = store.get(k);
    entry.ts = Date.now();
    return entry;
}

function setMembers(guildId, userId, ids) {
    const e = _ensure(guildId, userId);
    e.memberIds = ids || [];
}

function setVehicle(guildId, userId, vehicleName) {
    const e = _ensure(guildId, userId);
    e.vehicle = vehicleName || null;
}

function get(guildId, userId) {
    const entry = store.get(key(guildId, userId));
    if (!entry) return { memberIds: [], vehicle: null };
    if (Date.now() - entry.ts > TTL_MS) {
        store.delete(key(guildId, userId));
        return { memberIds: [], vehicle: null };
    }
    return { memberIds: entry.memberIds, vehicle: entry.vehicle };
}

function clear(guildId, userId) {
    store.delete(key(guildId, userId));
}

const interval = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) {
        if (now - v.ts > TTL_MS) store.delete(k);
    }
}, 5 * 60 * 1000);
if (interval.unref) interval.unref();

module.exports = { setMembers, setVehicle, get, clear };
