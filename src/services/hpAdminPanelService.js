const guildConfigRepo = require('../repositories/guildConfigRepository');
const { buildHpAdminPanelEmbed, buildHpAdminPanelComponents } = require('../utils/hpEmbeds');
const logger = require('../utils/logger');

async function refresh(guild) {
    try {
        const channelId = await guildConfigRepo.get(guild.id, 'hp_admin_panel_channel_id');
        if (!channelId) return;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        const embed      = buildHpAdminPanelEmbed();
        const components = buildHpAdminPanelComponents();
        const savedMsgId = await guildConfigRepo.get(guild.id, 'hp_admin_panel_message_id');

        if (savedMsgId) {
            try {
                const msg = await channel.messages.fetch(savedMsgId);
                await msg.edit({ embeds: [embed], components });
                return;
            } catch { /* mensagem deletada — cria nova */ }
        }

        const msg = await channel.send({ embeds: [embed], components });
        await guildConfigRepo.set(guild.id, 'hp_admin_panel_message_id', msg.id);
    } catch (err) {
        logger.warn('Não foi possível atualizar o painel admin do hospital', { guild: guild.id, error: err.message });
    }
}

module.exports = { refresh };
