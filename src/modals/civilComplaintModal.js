const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const pendingComplaint = require('../utils/pendingCivilComplaint');
const { COLOR } = require('../utils/embeds');

module.exports = {
    customId: 'modal:civil_complaint',

    async execute(interaction) {
        const citizenId   = interaction.fields.getTextInputValue('citizen_id').trim() || null;
        const name        = interaction.fields.getTextInputValue('complainant_name').trim() || null;
        const phone       = interaction.fields.getTextInputValue('phone').trim() || null;
        const subject     = interaction.fields.getTextInputValue('subject').trim();
        const description = interaction.fields.getTextInputValue('description').trim();

        pendingComplaint.set(interaction.guildId, interaction.user.id, {
            citizenId,
            complainantName: name,
            phone,
            subject,
            description,
        });

        const embed = new EmbedBuilder()
            .setColor(COLOR.INFO)
            .setTitle('📢 Denúncia — Confirmar')
            .setDescription(
                `**Assunto:** ${subject}\n\n` +
                '**Deseja anexar provas?**\n' +
                'Você pode enviar imagens, vídeos ou links. Um canal temporário será criado para o envio.'
            );

        return interaction.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('civilpanel:evidence_add')
                        .setLabel('📎 Adicionar Provas')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('civilpanel:evidence_skip')
                        .setLabel('Enviar sem Provas')
                        .setStyle(ButtonStyle.Secondary),
                ),
            ],
            ephemeral: true,
        });
    },
};
