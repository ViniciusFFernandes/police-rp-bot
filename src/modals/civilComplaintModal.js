const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const pendingComplaint = require('../utils/pendingCivilComplaint');
const { COLOR } = require('../utils/embeds');

module.exports = {
    customId: 'modal:civil_complaint',

    async execute(interaction) {
        const name        = interaction.fields.getTextInputValue('complainant_name').trim();
        const subject     = interaction.fields.getTextInputValue('subject').trim();
        const description = interaction.fields.getTextInputValue('description').trim();

        const isAnonymous = name.length === 0;

        pendingComplaint.set(interaction.guildId, interaction.user.id, {
            isAnonymous,
            complainantName: isAnonymous ? null : name,
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
