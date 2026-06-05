const iaMeasureRepo    = require('../repositories/iaMeasureRepository');
const iaMeasureService = require('../services/iaMeasureService');
const { isIAStaff, isAdmin, isSupervisor } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
    customId: 'iameasure',

    async execute(interaction) {
        const parts  = interaction.customId.split(':');
        const action = parts[1];
        const id     = parseInt(parts[2], 10);

        try {
            const elevated = isAdmin(interaction.member) || await isSupervisor(interaction.member) || await isIAStaff(interaction.member);
            if (!elevated) {
                return interaction.reply({ content: '❌ Acesso restrito à equipe de **Assuntos Internos**.', ephemeral: true });
            }

            const measure = await iaMeasureRepo.findById(id, interaction.guildId);
            if (!measure) {
                return interaction.reply({ content: '❌ Medida não encontrada.', ephemeral: true });
            }

            const STATUS_MAP = { in_progress: 'in_progress', completed: 'completed' };
            const newStatus  = STATUS_MAP[action];
            if (!newStatus) return;

            await interaction.deferUpdate();

            const updated = await iaMeasureRepo.updateStatus(id, interaction.guildId, newStatus);
            await iaMeasureService.refreshBoard(interaction.guild, updated);

        } catch (err) {
            logger.error('Erro no board de medidas disciplinares', { action, guild: interaction.guildId, error: err.message });
            const reply = { content: '❌ Ocorreu um erro. Tente novamente.', ephemeral: true };
            if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
            else await interaction.reply(reply);
        }
    },
};
