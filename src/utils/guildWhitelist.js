function getAllowedGuilds() {
    const raw = process.env.ALLOWED_GUILD_IDS || '';
    return raw.split(',').map(id => id.trim()).filter(Boolean);
}

function isAllowed(guildId) {
    const allowed = getAllowedGuilds();
    if (allowed.length === 0) return false;
    return allowed.includes(guildId);
}

module.exports = { isAllowed, getAllowedGuilds };
