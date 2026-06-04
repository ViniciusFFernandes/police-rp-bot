const { Events, InteractionType } = require('discord.js');
const { handleCommand } = require('../handlers/commandHandler');
const { handleButton } = require('../handlers/buttonHandler');
const { handleModal } = require('../handlers/modalHandler');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { isAllowed } = require('../utils/guildWhitelist');
const { hasPoliceAccess, isAdmin } = require('../utils/permissions');
const logger = require('../utils/logger');

// Estes comandos não precisam de configuração prévia do servidor
const ADMIN_COMMANDS = new Set(['configurar', 'configuracoes', 'veiculo', 'unidade']);

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Ignora interações fora de servidores (DMs)
        if (!interaction.guildId) {
            if (interaction.isRepliable()) {
                await interaction.reply({
                    content: 'Este bot só funciona dentro de servidores Discord.',
                    ephemeral: true,
                });
            }
            return;
        }

        // Bloqueia servidores não autorizados
        if (!isAllowed(interaction.guildId)) {
            if (interaction.isRepliable()) {
                await interaction.reply({
                    content: '⛔ Este bot é de uso privado e não está autorizado neste servidor.',
                    ephemeral: true,
                });
            }
            return;
        }

        if (interaction.isChatInputCommand()) {
            // Admins sempre passam; comandos de configuração também são isentos
            if (!isAdmin(interaction.member) && !ADMIN_COMMANDS.has(interaction.commandName)) {
                if (!await hasPoliceAccess(interaction.member)) {
                    return interaction.reply({
                        content: '🚫 Você não tem permissão para usar este bot.',
                        ephemeral: true,
                    });
                }
            }

            // Para comandos operacionais, avisa se o servidor não estiver configurado
            if (!ADMIN_COMMANDS.has(interaction.commandName)) {
                const configured = await guildConfigRepo.isConfigured(interaction.guildId);
                if (!configured) {
                    return interaction.reply({
                        content:
                            '⚠️ **Este servidor ainda não foi configurado.**\n' +
                            'Um administrador deve executar `/configurar` antes de usar este comando.',
                        ephemeral: true,
                    });
                }
            }
            return handleCommand(interaction);
        }

        // Botões, menus e modais também verificam acesso policial
        if (interaction.isButton() || interaction.isAnySelectMenu()) {
            if (!isAdmin(interaction.member) && !await hasPoliceAccess(interaction.member)) {
                return interaction.reply({ content: '🚫 Você não tem permissão para usar este bot.', ephemeral: true });
            }
            return handleButton(interaction);
        }

        if (interaction.type === InteractionType.ModalSubmit) {
            if (!isAdmin(interaction.member) && !await hasPoliceAccess(interaction.member)) {
                return interaction.reply({ content: '🚫 Você não tem permissão para usar este bot.', ephemeral: true });
            }
            return handleModal(interaction);
        }
    },
};
