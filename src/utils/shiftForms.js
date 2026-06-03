const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

// Modal de início de turno (Distrito / Unidade / Callsign).
// Usado tanto pelo comando /iniciar quanto pelo fluxo de remodulação.
function buildStartShiftModal() {
    const modal = new ModalBuilder()
        .setCustomId('modal:start_shift')
        .setTitle('Iniciar Turno de Serviço');

    const districtInput = new TextInputBuilder()
        .setCustomId('district')
        .setLabel('Distrito (ex: 1, 2, 3...)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(5);

    const unitInput = new TextInputBuilder()
        .setCustomId('unit')
        .setLabel('Unidade (ex: A, L, M, RPM...)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10);

    const callsignInput = new TextInputBuilder()
        .setCustomId('callsign')
        .setLabel('Callsign (ex: 12, 07...)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10);

    modal.addComponents(
        new ActionRowBuilder().addComponents(districtInput),
        new ActionRowBuilder().addComponents(unitInput),
        new ActionRowBuilder().addComponents(callsignInput),
    );

    return modal;
}

module.exports = { buildStartShiftModal };
