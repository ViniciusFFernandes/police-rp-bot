const pendingMeasure   = require('../utils/pendingMeasure');
const iaMeasureRepo    = require('../repositories/iaMeasureRepository');
const iaMeasureService = require('../services/iaMeasureService');
const logger           = require('../utils/logger');

module.exports = {
    customId: 'modal:iapanel_measure',

    matches(id) { return id.startsWith('modal:iapanel_measure:'); },

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetId = interaction.customId.split(':')[2];
        const guildId  = interaction.guildId;
        const pending  = pendingMeasure.get(guildId, interaction.user.id);

        if (!pending?.type || !pending?.targetId) {
            return interaction.editReply({ content: '❌ Sessão expirada. Inicie novamente pelo painel de Assuntos Internos.' });
        }

        const duration    = interaction.fields.getTextInputValue('duration')?.trim() || null;
        const description = interaction.fields.getTextInputValue('description').trim();
        pendingMeasure.clear(guildId, interaction.user.id);

        try {
            const measureNumber = await iaMeasureRepo.nextMeasureNumber(guildId);

            const measure = await iaMeasureRepo.create({
                guildId,
                measureNumber,
                type:               pending.type,
                targetDiscordId:    targetId,
                appliedByDiscordId: interaction.user.id,
                duration,
                weaponSurrender:    pending.weaponSurrender === 'yes',
                description,
            });

            await iaMeasureService.postBoard(interaction.guild, measure);

            const weaponNote = pending.weaponSurrender === 'yes'
                ? '\n⚠️ O oficial deve **entregar seu armamento** à equipe de Assuntos Internos.'
                : '';

            return interaction.editReply({
                content: `✅ Medida **${measureNumber}** registrada para <@${targetId}>.${weaponNote}`,
            });
        } catch (err) {
            logger.error('Erro ao registrar medida disciplinar', { guild: guildId, error: err.message });
            return interaction.editReply({ content: '❌ Ocorreu um erro ao registrar a medida. Tente novamente.' });
        }
    },
};
