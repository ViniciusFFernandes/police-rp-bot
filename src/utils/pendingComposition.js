// Armazena temporariamente os dados de composição da unidade entre interações
// (modal de callsign → selects de unidade/viatura/membros → confirmação).
// Chaveado por (guild, ator). TTL de 10 minutos.

const TTL_MS = 10 * 60 * 1000;
const store = new Map();

function key(guildId, userId) {
    return `${guildId}:${userId}`;
}

function _get(guildId, userId) {
    const k = key(guildId, userId);
    const entry = store.get(k);
    if (!entry) return null;
    if (Date.now() - entry.ts > TTL_MS) { store.delete(k); return null; }
    return entry;
}

function _ensure(guildId, userId) {
    const existing = _get(guildId, userId);
    if (existing) { existing.ts = Date.now(); return existing; }
    const entry = { district: null, callsignNum: null, unit: null, vehicle: null, memberIds: [], ts: Date.now() };
    store.set(key(guildId, userId), entry);
    return entry;
}

// Chamado pelo modal handler logo após receber Distrito + Callsign
function setBase(guildId, userId, district, callsignNum) {
    const e = _ensure(guildId, userId);
    e.district    = district;
    e.callsignNum = callsignNum;
    // Limpa seleções anteriores quando uma nova base é definida
    e.unit      = null;
    e.vehicle   = null;
    e.memberIds = [];
    e.ts = Date.now();
}

function setUnit(guildId, userId, unit) {
    const e = _ensure(guildId, userId);
    e.unit = unit || null;
}

function setVehicle(guildId, userId, vehicleName) {
    const e = _ensure(guildId, userId);
    e.vehicle = vehicleName || null;
}

function setMembers(guildId, userId, ids) {
    const e = _ensure(guildId, userId);
    e.memberIds = ids || [];
}

// Retorna todos os dados da composição pendente
function get(guildId, userId) {
    const entry = _get(guildId, userId);
    if (!entry) return { district: null, callsignNum: null, unit: null, vehicle: null, memberIds: [] };
    return {
        district:    entry.district,
        callsignNum: entry.callsignNum,
        unit:        entry.unit,
        vehicle:     entry.vehicle,
        memberIds:   entry.memberIds,
    };
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

module.exports = { setBase, setUnit, setVehicle, setMembers, get, clear };
