const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const pendingTrafficWarning = require('../utils/pendingTrafficWarning');

const customId = 'modal:traffic_warning_step1';

function build() {
    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle('Advertência de Trânsito — Etapa 1/2')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('condutor_name')
                    .setLabel('Nome do condutor')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(150)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('citizen_id')
                    .setLabel('CitizenID')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(50)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('plate')
                    .setLabel('Placa do veículo (opcional)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(20)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('deadline')
                    .setLabel('Prazo da advertência')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(50)
            ),
        );
}

module.exports = {
    customId,
    build,
    async execute(interaction) {
        const condutorName = interaction.fields.getTextInputValue('condutor_name').trim();
        const citizenId    = interaction.fields.getTextInputValue('citizen_id').trim();
        const plate        = interaction.fields.getTextInputValue('plate').trim();
        const deadline     = interaction.fields.getTextInputValue('deadline').trim();

        pendingTrafficWarning.set(interaction.guildId, interaction.user.id, {
            condutorName, citizenId,
            plate: plate || null,
            deadline: deadline || null,
        });

        const step2 = require('./trafficWarningStep2Modal');
        return interaction.showModal(step2.build());
    },
};
