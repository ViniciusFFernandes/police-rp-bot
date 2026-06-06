const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const complaintRepo = require('../repositories/civilComplaintRepository');
const civilComplaintService = require('../services/civilComplaintService');
const { isIAStaff } = require('../utils/permissions');

module.exports = {
    customId: 'civilcomplaint',

    async execute(interaction) {
        const [, action, complaintId] = interaction.customId.split(':');

        if (!await isIAStaff(interaction.member)) {
            return interaction.reply({ content: '❌ Acesso restrito à equipe de **Assuntos Internos**.', ephemeral: true });
        }

        if (action === 'accept') {
            await interaction.deferReply({ ephemeral: true });

            const complaint = await complaintRepo.findById(complaintId, interaction.guildId);
            if (!complaint) return interaction.editReply({ content: '❌ Denúncia não encontrada.' });

            const updated = await complaintRepo.review(complaintId, interaction.guildId, 'accepted', interaction.user.id,
                `Aceita para abertura de investigação. Use "Abrir Investigação" no Painel de IA com origem Civil, referenciando ${complaint.complaint_number} como reclamante.`);
            await civilComplaintService.refreshReviewCard(interaction.guild, updated);

            return interaction.editReply({
                content:
                    `✅ Denúncia **${complaint.complaint_number}** aceita.\n` +
                    `Para registrar a investigação, use **Abrir Investigação** no Painel de IA, selecione origem **Civil** e informe **${complaint.complaint_number}** como identificação do reclamante.`,
            });
        }

        if (action === 'reject') {
            const modal = new ModalBuilder()
                .setCustomId(`civilcomplaint_reject:${complaintId}`)
                .setTitle('Arquivar Denúncia');

            const noteInput = new TextInputBuilder()
                .setCustomId('review_note')
                .setLabel('Motivo do arquivamento (opcional)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setMaxLength(500);

            modal.addComponents(new ActionRowBuilder().addComponents(noteInput));
            return interaction.showModal(modal);
        }
    },
};
