const iaMeasureRepo = require('../repositories/iaMeasureRepository');
const { isAdmin, isSupervisor } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
    customId: 'modal:iapanel_measure_delete',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!isAdmin(interaction.member) && !await isSupervisor(interaction.member)) {
            return interaction.editReply({ content: '❌ Apenas **Administradores** e **Supervisores** podem deletar medidas.' });
        }

        const measureNumber = interaction.fields.getTextInputValue('measure_number').trim().toUpperCase();
        const guildId       = interaction.guildId;

        try {
            const measure = await iaMeasureRepo.findByMeasureNumber(measureNumber, guildId);
            if (!measure) {
                return interaction.editReply({ content: `❌ Medida \`${measureNumber}\` não encontrada.` });
            }

            // Tenta deletar a mensagem do board se existir
            if (measure.board_message_id && measure.board_channel_id) {
                const channel = interaction.guild.channels.cache.get(measure.board_channel_id);
                if (channel) {
                    await channel.messages.fetch(measure.board_message_id)
                        .then(msg => msg.delete())
                        .catch(() => {});
                }
            }

            await iaMeasureRepo.remove(measure.id, guildId);

            return interaction.editReply({ content: `🗑️ Medida \`${measureNumber}\` deletada com sucesso.` });
        } catch (err) {
            logger.error('Erro ao deletar medida disciplinar', { guild: guildId, error: err.message });
            return interaction.editReply({ content: '❌ Ocorreu um erro ao deletar a medida. Tente novamente.' });
        }
    },
};
