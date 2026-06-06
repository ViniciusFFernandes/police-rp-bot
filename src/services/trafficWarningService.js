const { EmbedBuilder } = require('discord.js');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { COLOR } = require('../utils/embeds');
const { formatTimestamp } = require('../utils/time');
const logger = require('../utils/logger');

function buildWarningEmbed(warning, registeredBy) {
    return new EmbedBuilder()
        .setColor(COLOR.WARNING ?? COLOR.INFO)
        .setTitle(`🚦 Advertência de Trânsito — ${warning.warning_number}`)
        .addFields(
            { name: '👤 Condutor',  value: warning.condutor_name, inline: true },
            { name: '🪪 CitizenID', value: warning.citizen_id,    inline: true },
            { name: '🚗 Placa',     value: warning.plate || '—',  inline: true },
            { name: '⏳ Prazo',     value: warning.deadline || '—', inline: true },
            { name: '⚠️ Infrações', value: warning.infractions },
            { name: '📝 Descrição', value: warning.description || '—' },
            { name: '👮 Registrado por', value: `<@${warning.registered_by_discord_id}>`, inline: true },
            { name: '🕐 Data', value: formatTimestamp(warning.created_at), inline: true },
        )
        .setTimestamp();
}

async function postNotification(guild, warning) {
    try {
        const channelId = await guildConfigRepo.get(guild.id, 'traffic_warnings_channel_id');
        if (!channelId) return;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        await channel.send({ embeds: [buildWarningEmbed(warning)] });
    } catch (err) {
        logger.warn('Não foi possível enviar notificação de advertência de trânsito', {
            guild: guild.id,
            error: err.message,
        });
    }
}

module.exports = { buildWarningEmbed, postNotification };
