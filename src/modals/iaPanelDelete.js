const iaRepo = require('../repositories/iaRepository');
const { isAdmin, isSupervisor } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
    customId: 'modal:iapanel_delete',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!isAdmin(interaction.member) && !await isSupervisor(interaction.member)) {
            return interaction.editReply({
                content: '❌ Apenas **Administradores** e **Supervisores** podem deletar investigações.',
            });
        }

        const caseNumber = interaction.fields.getTextInputValue('case_number').trim();

        try {
            const inv = await iaRepo.findByCaseNumber(caseNumber, interaction.guildId);

            if (!inv) {
                return interaction.editReply({ content: `❌ Investigação **${caseNumber}** não encontrada neste servidor.` });
            }

            if (inv.board_message_id && inv.board_channel_id) {
                const ch = interaction.guild.channels.cache.get(inv.board_channel_id);
                if (ch) {
                    const msg = await ch.messages.fetch(inv.board_message_id).catch(() => null);
                    if (msg) await msg.delete().catch(() => {});
                }
            }

            await iaRepo.remove(inv.id, interaction.guildId);

            return interaction.editReply({
                content: `🗑️ Investigação **${inv.case_number}** deletada permanentemente.`,
            });
        } catch (err) {
            logger.error('Erro ao deletar investigação pelo painel de IA', { guild: interaction.guildId, error: err.message });
            return interaction.editReply({ content: '❌ Ocorreu um erro. Tente novamente.' });
        }
    },
};
