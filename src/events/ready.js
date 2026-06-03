const { Events, ActivityType } = require('discord.js');
const botConfigRepo = require('../repositories/botConfigRepository');
const logger = require('../utils/logger');

const TYPE_MAP = {
    PLAYING:   ActivityType.Playing,
    WATCHING:  ActivityType.Watching,
    LISTENING: ActivityType.Listening,
    COMPETING: ActivityType.Competing,
};

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`Bot online: ${client.user.tag} (${client.user.id})`);

        try {
            const text = await botConfigRepo.get('activity_text');
            const type = await botConfigRepo.get('activity_type');

            if (text && type && TYPE_MAP[type]) {
                client.user.setActivity(text, { type: TYPE_MAP[type] });
            } else {
                client.user.setActivity('Departamento de Polícia', { type: ActivityType.Watching });
            }
        } catch {
            client.user.setActivity('Departamento de Polícia', { type: ActivityType.Watching });
        }
    },
};
