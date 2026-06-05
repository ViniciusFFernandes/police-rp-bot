/**
 * Coleta provas do canal temporário e as publica no canal de arquivo.
 * Retorna a string de evidências para salvar no banco.
 *
 * @param {object} opts
 * @param {import('discord.js').Guild}   opts.guild
 * @param {string}  opts.provasChannelId - ID do canal temporário
 * @param {string}  opts.collectionMsgId - ID da msg "envie suas provas aqui"
 * @param {string}  opts.openerId        - Discord ID do oficial que enviou
 * @param {string|null} opts.archiveChannelId - canal de arquivo permanente
 * @param {string}  opts.label           - ex: "IA-2026-001" para identificar no arquivo
 * @returns {Promise<string|null>}  string de evidências ou null se nada foi enviado
 */
async function collectEvidence({ guild, provasChannelId, collectionMsgId, openerId, archiveChannelId, label }) {
    const provasChannel = guild.channels.cache.get(provasChannelId)
        ?? await guild.channels.fetch(provasChannelId).catch(() => null);

    if (!provasChannel) return null;

    // Busca mensagens do usuário após a mensagem inicial do bot
    const rawMessages = collectionMsgId
        ? (await provasChannel.messages.fetch({ after: collectionMsgId, limit: 100 }))
              .filter(m => m.author.id === openerId && !m.author.bot)
        : new Map();

    const textParts       = [];
    const attachmentFiles = [];

    for (const msg of rawMessages.values()) {
        if (msg.content?.trim()) textParts.push(msg.content.trim());
        for (const att of msg.attachments.values()) {
            attachmentFiles.push({ url: att.url, name: att.name });
        }
    }

    const evidenceLines = [...textParts];

    if (attachmentFiles.length > 0) {
        const archiveChannel = archiveChannelId
            ? (guild.channels.cache.get(archiveChannelId) ?? await guild.channels.fetch(archiveChannelId).catch(() => null))
            : null;

        if (archiveChannel) {
            // Envia em chunks de 10 (limite do Discord) e guarda link numerado da mensagem
            const chunks = [];
            for (let i = 0; i < attachmentFiles.length; i += 10) chunks.push(attachmentFiles.slice(i, i + 10));
            const total = chunks.length;

            for (let i = 0; i < chunks.length; i++) {
                const sent = await archiveChannel.send({
                    content: i === 0 ? `📎 Provas — **${label}**` : null,
                    files: chunks[i].map(f => f.url),
                });
                const msgLink = `https://discord.com/channels/${guild.id}/${archiveChannel.id}/${sent.id}`;
                evidenceLines.push(`[${i + 1}/${total}] ${msgLink}`);
            }
        } else {
            // Sem canal de arquivo: guarda URLs originais como fallback
            for (const f of attachmentFiles) evidenceLines.push(f.url);
        }
    }

    return evidenceLines.length > 0 ? evidenceLines.join('\n') : null;
}

module.exports = { collectEvidence };
