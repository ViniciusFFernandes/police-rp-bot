const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

// Modal de início de turno — coleta apenas Distrito e Callsign.
// A Unidade é selecionada na tela seguinte (StringSelectMenu com as unidades
// cadastradas via /unidade registrar, ou texto livre se nenhuma cadastrada).
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

    const callsignInput = new TextInputBuilder()
        .setCustomId('callsign')
        .setLabel('Callsign (ex: 12, 07...)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10);

    modal.addComponents(
        new ActionRowBuilder().addComponents(districtInput),
        new ActionRowBuilder().addComponents(callsignInput),
    );

    return modal;
}

module.exports = { buildStartShiftModal };
