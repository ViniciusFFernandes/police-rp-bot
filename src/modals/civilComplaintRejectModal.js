// Modal handler: civilcomplaint_reject:<complaintId> — justificativa de arquivamento
const complaintRepo = require('../repositories/civilComplaintRepository');
const civilComplaintService = require('../services/civilComplaintService');

module.exports = {
    customId: 'civilcomplaint_reject',
    matches: (id) => id.startsWith('civilcomplaint_reject:'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const [, complaintId] = interaction.customId.split(':');
        const note = interaction.fields.getTextInputValue('review_note').trim() || null;

        const complaint = await complaintRepo.findById(complaintId, interaction.guildId);
        if (!complaint) return interaction.editReply({ content: '❌ Denúncia não encontrada.' });

        const updated = await complaintRepo.review(complaintId, interaction.guildId, 'rejected', interaction.user.id, note);
        await civilComplaintService.refreshReviewCard(interaction.guild, updated);

        await interaction.editReply({
            content: `❌ Denúncia **${complaint.complaint_number}** arquivada.`,
        });
    },
};
