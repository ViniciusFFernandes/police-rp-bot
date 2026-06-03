const { SlashCommandBuilder } = require('discord.js');
const { openCompositionScreen } = require('../../utils/openCompositionScreen');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('iniciar')
        .setDescription('Inicia um novo turno como unidade operacional'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        await openCompositionScreen(interaction);
    },
};
