const iaRepo    = require('../repositories/iaRepository');
const iaService = require('../services/iaService');
const logger    = require('../utils/logger');

module.exports = {
    customId: 'modal:iapanel_view',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const caseNumber = interaction.fields.getTextInputValue('case_number').trim();

        try {
            const inv = await iaRepo.findByCaseNumber(caseNumber, interaction.guildId);

            if (!inv) {
                return interaction.editReply({ content: `❌ Investigação **${caseNumber}** não encontrada.` });
            }

            const embed = iaService.buildBoardEmbed(inv);
            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            logger.error('Erro ao ver investigação pelo painel de IA', { guild: interaction.guildId, error: err.message });
            return interaction.editReply({ content: '❌ Ocorreu um erro. Tente novamente.' });
        }
    },
};
