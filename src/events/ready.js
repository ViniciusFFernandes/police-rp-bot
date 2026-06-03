const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`Bot online: ${client.user.tag} (${client.user.id})`);
        client.user.setActivity('Departamento de Polícia', { type: ActivityType.Watching });
    },
};
