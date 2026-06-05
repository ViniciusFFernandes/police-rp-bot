// Modal handler: sr_board_edit:<reportId> — edita a descrição de um relatório existente
const srRepo    = require('../repositories/serviceReportRepository');
const srService = require('../services/serviceReportService');

module.exports = {
    customId: 'sr_board_edit',
    matches: (id) => id.startsWith('sr_board_edit:'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const reportId    = interaction.customId.split(':')[1];
        const description = interaction.fields.getTextInputValue('description').trim();

        const report = await srRepo.findById(reportId, interaction.guildId);
        if (!report) return interaction.editReply({ content: '❌ Relatório não encontrado.' });

        await srRepo.updateDescription(reportId, interaction.guildId, description);
        const updated = await srRepo.findById(reportId, interaction.guildId);
        await srService.refreshBoard(interaction.guild, updated);

        await interaction.editReply({
            content: `✅ Descrição do relatório **${report.report_number}** atualizada com sucesso.`,
        });
    },
};
