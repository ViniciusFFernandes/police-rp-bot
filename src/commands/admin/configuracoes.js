const { SlashCommandBuilder } = require('discord.js');
const guildConfigService = require('../../services/guildConfigService');
const { isConfigManager } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configuracoes')
        .setDescription('Exibe todas as configurações atuais do servidor'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!await isConfigManager(interaction.member)) {
            return interaction.editReply({
                content: '❌ Você não tem permissão para ver as configurações.\nApenas **Administradores** e **Gestores de Configuração** podem usar este comando.',
            });
        }

        const embeds = await guildConfigService.buildConfigEmbed(interaction.guild);
        await interaction.editReply({ embeds });
    },
};
