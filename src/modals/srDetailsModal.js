// Modal handler: sr_details — detalhes do relatório de serviço
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const pendingSR = require('../utils/pendingSR');
const { COLOR } = require('../utils/embeds');

module.exports = {
    customId: 'sr_details',

    async execute(interaction) {
        const location  = interaction.fields.getTextInputValue('incident_location').trim() || null;
        const datetime  = interaction.fields.getTextInputValue('incident_datetime').trim()  || null;
        const desc      = interaction.fields.getTextInputValue('description').trim();
        const suspects  = interaction.fields.getTextInputValue('suspects').trim()      || null;
        const seized    = interaction.fields.getTextInputValue('seized_items').trim()  || null;

        // Separa data e hora
        let incidentDate = null;
        let incidentTime = null;
        if (datetime) {
            const match = datetime.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})$/);
            if (match) {
                const [d, m, y] = match[1].split('/');
                incidentDate = `${y}-${m}-${d}`;
                incidentTime = match[2];
            } else {
                incidentDate = null;
                incidentTime = datetime;
            }
        }

        pendingSR.setStep2(interaction.guildId, interaction.user.id, {
            incidentLocation: location,
            incidentDate,
            incidentTime,
            description: desc,
            suspects,
            seizedItems: seized,
        });

        const pending = pendingSR.get(interaction.guildId, interaction.user.id);
        const TYPE_LABEL = {
            ocorrencia:          '🟦 Ocorrência',
            prisao:              '🟩 Prisão/Captura',
            crime_nao_resolvido: '🟥 Crime Não Resolvido',
        };

        const embed = new EmbedBuilder()
            .setColor(COLOR.INFO)
            .setTitle('📋 Relatório de Serviço — Confirmar')
            .setDescription(
                `**Tipo:** ${TYPE_LABEL[pending?.type] || pending?.type}\n\n` +
                '**Deseja anexar provas?**\n' +
                'Você pode enviar imagens, vídeos ou links. Um canal temporário será criado para o envio.'
            );

        return interaction.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('sr:evidence_add')
                        .setLabel('📎 Adicionar Provas')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('sr:evidence_skip')
                        .setLabel('Criar sem Provas')
                        .setStyle(ButtonStyle.Secondary),
                ),
            ],
            ephemeral: true,
        });
    },
};
