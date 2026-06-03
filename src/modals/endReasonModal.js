const shiftService = require('../services/shiftService');
const { endReasonLabel } = require('../utils/embeds');
const logger = require('../utils/logger');

// Encerramento com motivo "Outro" — o oficial pode digitar um motivo
// personalizado (opcional). customId: modal:end_reason:<ownerDiscordId>
module.exports = {
    customId: 'modal:end_reason',

    // O modalHandler casa pelo customId exato; este modal usa um sufixo dinâmico,
    // então registramos um matcher para o handler ser localizado pelo prefixo.
    matches(customId) {
        return customId.startsWith('modal:end_reason');
    },

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const ownerDiscordId = interaction.customId.split(':')[2];
        const note = interaction.fields.getTextInputValue('note')?.trim() || null;

        try {
            const result = await shiftService.endShift(interaction, ownerDiscordId, {
                reason: 'other',
                reasonNote: note,
            });

            if (result.error) {
                return interaction.editReply({ content: `❌ ${result.error}` });
            }

            await interaction.editReply({
                content: `🔴 Turno encerrado — **${endReasonLabel('other', note)}**. Bom descanso!`,
            });
        } catch (err) {
            logger.error('Erro ao encerrar turno (motivo personalizado)', { guild: interaction.guildId, error: err.message });
            await interaction.editReply({ content: '❌ Erro ao encerrar o turno.' });
        }
    },
};
