const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const guildConfigService = require('../../services/guildConfigService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configuracoes')
        .setDescription('Exibe todas as configurações atuais do servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const embed = await guildConfigService.buildConfigEmbed(interaction.guild);
        await interaction.editReply({ embeds: [embed] });
    },
};
