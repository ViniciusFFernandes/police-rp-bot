const TTL = 15 * 60 * 1000;
const store = new Map();

function key(guildId, userId) { return `${guildId}:${userId}`; }

function set(guildId, userId, data) {
    const k = key(guildId, userId);
    const existing = store.get(k) ?? {};
    store.set(k, { ...existing, ...data, _ts: Date.now() });
}

function get(guildId, userId) {
    const entry = store.get(key(guildId, userId));
    if (!entry) return null;
    if (Date.now() - entry._ts > TTL) { store.delete(key(guildId, userId)); return null; }
    return entry;
}

function clear(guildId, userId) { store.delete(key(guildId, userId)); }

module.exports = { set, get, clear };
