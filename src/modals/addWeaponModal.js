const shiftService = require('../services/shiftService');
const logger = require('../utils/logger');

module.exports = {
    customId: 'modal:add_weapon',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const weaponName   = interaction.fields.getTextInputValue('weapon_name').trim();
        const serialNumber = interaction.fields.getTextInputValue('serial_number').trim();

        try {
            const result = await shiftService.addWeaponToShift(interaction, { weaponName, serialNumber });

            if (result.error) {
                return interaction.editReply({ content: `❌ ${result.error}` });
            }

            await interaction.editReply({
                content: `✅ Arma **${weaponName}** (\`${serialNumber}\`) adicionada ao turno e registrada no seu arsenal.`,
            });
        } catch (err) {
            logger.error('Erro ao adicionar arma ao turno', { guild: interaction.guildId, error: err.message });
            await interaction.editReply({ content: '❌ Ocorreu um erro. Tente novamente.' });
        }
    },
};
