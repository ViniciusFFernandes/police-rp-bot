const { SlashCommandBuilder } = require('discord.js');
const { buildStartShiftModal } = require('../../utils/shiftForms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('iniciar')
        .setDescription('Inicia um novo turno como unidade operacional'),

    async execute(interaction) {
        await interaction.showModal(buildStartShiftModal());
    },
};
