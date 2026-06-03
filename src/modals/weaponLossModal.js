const shiftService = require('../services/shiftService');
const logger = require('../utils/logger');

module.exports = {
    customId: 'modal:weapon_loss',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const serialNumber = interaction.fields.getTextInputValue('serial_number').trim();
        const observation = interaction.fields.getTextInputValue('observation').trim();

        try {
            const result = await shiftService.reportWeaponLoss(interaction, { serialNumber, observation });

            if (result.error) {
                return interaction.editReply({ content: `❌ ${result.error}` });
            }

            await interaction.editReply({
                content: `⚠️ Extravio da arma \`${serialNumber}\` registrado com sucesso.`,
            });
        } catch (err) {
            logger.error('Erro ao registrar extravio', { error: err.message });
            await interaction.editReply({ content: '❌ Ocorreu um erro. Tente novamente.' });
        }
    },
};
