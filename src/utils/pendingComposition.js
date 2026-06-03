// Armazena temporariamente os oficiais adicionais selecionados no menu de
// composição da unidade, entre a interação do UserSelectMenu e o clique no
// botão "Iniciar Turno". Chaveado por (guild, ator) — cada ator interage
// apenas com a própria mensagem efêmera, então não há colisão entre usuários.

const TTL_MS = 10 * 60 * 1000; // 10 minutos
const store = new Map();

function key(guildId, userId) {
    return `${guildId}:${userId}`;
}

function setMembers(guildId, userId, ids) {
    store.set(key(guildId, userId), { ids: ids || [], ts: Date.now() });
}

function getMembers(guildId, userId) {
    const entry = store.get(key(guildId, userId));
    if (!entry) return [];
    if (Date.now() - entry.ts > TTL_MS) {
        store.delete(key(guildId, userId));
        return [];
    }
    return entry.ids;
}

function clear(guildId, userId) {
    store.delete(key(guildId, userId));
}

// Limpeza periódica de entradas expiradas
const interval = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) {
        if (now - v.ts > TTL_MS) store.delete(k);
    }
}, 5 * 60 * 1000);
if (interval.unref) interval.unref();

module.exports = { setMembers, getMembers, clear };
