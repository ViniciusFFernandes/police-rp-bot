// Modal handler: ia_board_edit:<invId> — edita a descrição de uma investigação existente
const iaRepo    = require('../repositories/iaRepository');
const iaService = require('../services/iaService');

module.exports = {
    customId: 'ia_board_edit',
    matches: (id) => id.startsWith('ia_board_edit:'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const invId      = interaction.customId.split(':')[1];
        const description = interaction.fields.getTextInputValue('description').trim();

        const inv = await iaRepo.findById(invId, interaction.guildId);
        if (!inv) return interaction.editReply({ content: '❌ Investigação não encontrada.' });

        await iaRepo.updateDescription(invId, interaction.guildId, description);
        const updated = await iaRepo.findById(invId, interaction.guildId);
        await iaService.refreshBoard(interaction.guild, updated);

        await interaction.editReply({
            content: `✅ Descrição da investigação **${inv.case_number}** atualizada com sucesso.`,
        });
    },
};
