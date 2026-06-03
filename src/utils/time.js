function formatDuration(ms) {
    if (!ms || ms < 0) return '0min';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}min ${seconds}s`;
    if (minutes > 0) return `${minutes}min ${seconds}s`;
    return `${seconds}s`;
}

function formatTimestamp(date) {
    return `<t:${Math.floor(new Date(date).getTime() / 1000)}:f>`;
}

function formatRelative(date) {
    return `<t:${Math.floor(new Date(date).getTime() / 1000)}:R>`;
}

function nowBrazil() {
    return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

module.exports = { formatDuration, formatTimestamp, formatRelative, nowBrazil };
