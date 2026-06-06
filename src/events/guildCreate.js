const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { isAllowed } = require('../utils/guildWhitelist');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildCreate,
    async execute(guild) {
        logger.info(`Bot adicionado ao servidor: ${guild.name} (${guild.id})`);

        // Servidor não autorizado — sai imediatamente
        if (!isAllowed(guild.id)) {
            logger.warn(`Servidor não autorizado, saindo: ${guild.name} (${guild.id})`);
            try {
                const channel = guild.channels.cache
                    .filter(c =>
                        c.isTextBased() &&
                        c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages)
                    )
                    .sort((a, b) => a.rawPosition - b.rawPosition)
                    .first();

                if (channel) {
                    await channel.send(
                        '⛔ Este bot é de uso privado e não está autorizado a operar neste servidor.'
                    );
                }
            } catch { /* ignora erros ao avisar */ }

            await guild.leave();
            return;
        }

        const already = await guildConfigRepo.isConfigured(guild.id);
        if (already) return;

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('👋 Olá! Sou o Police RP Bot')
            .setDescription(
                'Obrigado por me adicionar ao servidor!\n\n' +
                'Antes de usar qualquer funcionalidade, um administrador precisa realizar a **configuração inicial**.'
            )
            .addFields(
                {
                    name: '⚙️ Comandos de configuração',
                    value: [
                        '`/configurar canal-turnos` — canal para as embeds de turno',
                        '`/configurar canal-relatorios` — canal para relatórios',
                        '`/configurar canal-armamento` — canal para extravios',
                        '`/configurar categoria-voz` — categoria para canais de voz',
                        '`/configurar-cargos cargo-supervisor` — cargos que gerenciam turnos',
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '📋 Ver configurações',
                    value: '`/configuracoes` — exibe o status atual de todas as configurações',
                    inline: false,
                },
            )
            .setFooter({ text: 'Após configurar, use /iniciar para começar.' })
            .setTimestamp();

        try {
            const channel = guild.channels.cache
                .filter(c =>
                    c.isTextBased() &&
                    c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages)
                )
                .sort((a, b) => a.rawPosition - b.rawPosition)
                .first();

            if (channel) await channel.send({ embeds: [embed] });
        } catch (err) {
            logger.warn(`Não foi possível enviar mensagem de boas-vindas para ${guild.name}`, { error: err.message });
        }
    },
};
