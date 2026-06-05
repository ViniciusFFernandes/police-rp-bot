// Modal handler: ia_details — received after step 2 button in IA opening flow
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const pendingIA = require('../utils/pendingIA');
const { COLOR } = require('../utils/embeds');

module.exports = {
    customId: 'ia_details',

    async execute(interaction) {
        await interaction.deferUpdate();

        const radioVehicle    = interaction.fields.getTextInputValue('radio_vehicle').trim()        || null;
        const datetimeRaw     = interaction.fields.getTextInputValue('incident_datetime').trim()    || null;
        const incidentLocation = interaction.fields.getTextInputValue('incident_location').trim()   || null;
        const classification  = interaction.fields.getTextInputValue('classification').trim()       || null;
        const complainantId   = interaction.fields.getTextInputValue('complainant_id').trim()       || null;

        let incidentDate = null;
        let incidentTime = null;
        if (datetimeRaw) {
            const parts = datetimeRaw.split(' ');
            incidentDate = parts[0] || null;
            incidentTime = parts[1] || null;
        }

        pendingIA.setStep2(interaction.guildId, interaction.user.id, {
            radioVehicle, incidentDate, incidentTime, incidentLocation, classification, complainantId,
        });

        const pending = pendingIA.get(interaction.guildId, interaction.user.id);
        const ORIGIN_LABEL = { civil: '🟦 Civil', internal: '🟥 Interna', ois: '⬛ OIS' };

        const summaryLines = [
            `**Origem:** ${ORIGIN_LABEL[pending.origin] || pending.origin}`,
            `**Acusado:** <@${pending.involvedDiscordId}>`,
            radioVehicle    ? `**Viatura:** ${radioVehicle}` : null,
            datetimeRaw     ? `**Data/Hora:** ${datetimeRaw}` : null,
            incidentLocation ? `**Local:** ${incidentLocation}` : null,
            `**Classificação:** ${classification}`,
            complainantId   ? `**Reclamante:** ${complainantId}` : null,
        ].filter(Boolean).join('\n');

        const embed = new EmbedBuilder()
            .setColor(COLOR.INFO)
            .setTitle('🔍 Nova Investigação Interna')
            .setDescription(
                '**Etapa 3 de 3** — Descrição\n\n' +
                summaryLines + '\n\n' +
                'Agora adicione a **descrição do ocorrido**. As provas serão solicitadas na etapa seguinte.'
            );

        const nextBtn = new ButtonBuilder()
            .setCustomId('ia:step3')
            .setLabel('Adicionar Descrição →')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝');

        await interaction.editReply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(nextBtn)],
        });
    },
};
