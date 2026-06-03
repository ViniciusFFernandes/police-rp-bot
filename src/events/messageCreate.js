const { Events } = require('discord.js');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const logger = require('../utils/logger');

const DELETE_DELAY_MS = 10_000;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignora DMs e mensagens do próprio bot
        if (!message.guildId || message.author.id === message.client.user.id) return;

        try {
            const shiftChannelId = await guildConfigRepo.get(message.guildId, 'shift_channel_id');
            if (!shiftChannelId || message.channelId !== shiftChannelId) return;

            // Mantém apenas mensagens do bot (embeds de turno)
            if (!message.author.bot) {
                setTimeout(async () => {
                    try {
                        await message.delete();
                    } catch {
                        // Mensagem já pode ter sido deletada
                    }
                }, DELETE_DELAY_MS);
            }
        } catch (err) {
            logger.debug('messageCreate guard error', { error: err.message });
        }
    },
};
