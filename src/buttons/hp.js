const hpShiftService  = require('../services/hpShiftService');
const hpShiftRepo     = require('../repositories/hpShiftRepository');
const { hasHpAccess } = require('../utils/hpPermissions');
const logger = require('../utils/logger');

module.exports = {
    customId: 'hp',

    async execute(interaction) {
        const parts  = interaction.customId.split(':');
        const action = parts[1];

        try {
            if (!await hasHpAccess(interaction.member)) {
                return interaction.reply({
                    content: '🚫 Você não tem permissão para usar o painel do hospital.',
                    ephemeral: true,
                });
            }

            // ── Iniciar Turno ─────────────────────────────────────────
            if (action === 'start') {
                await interaction.deferReply({ ephemeral: true });
                const result = await hpShiftService.startShift(interaction);

                if (result.error) {
                    return interaction.editReply({ content: `❌ ${result.error}` });
                }
                return interaction.editReply({ content: '✅ Turno iniciado com sucesso! O registro apareceu no canal de turnos.' });
            }

            // ── Pausar (pelo painel) ───────────────────────────────────
            if (action === 'pause') {
                await interaction.deferReply({ ephemeral: true });
                const result = await hpShiftService.pauseShift(interaction);

                if (result.error) return interaction.editReply({ content: `❌ ${result.error}` });
                return interaction.editReply({ content: '⏸️ Turno pausado.' });
            }

            // ── Retornar (pelo painel) ─────────────────────────────────
            if (action === 'resume') {
                await interaction.deferReply({ ephemeral: true });
                const result = await hpShiftService.resumeShift(interaction);

                if (result.error) return interaction.editReply({ content: `❌ ${result.error}` });
                return interaction.editReply({ content: '▶️ Turno retomado.' });
            }

            // ── Pausar ou Retornar (botão inteligente do painel) ──────
            if (action === 'pause_or_resume') {
                await interaction.deferReply({ ephemeral: true });
                const shift = await hpShiftRepo.findActiveByUser(interaction.user.id, interaction.guildId);

                if (!shift) return interaction.editReply({ content: '❌ Você não possui turno ativo.' });

                if (shift.status === 'paused') {
                    const result = await hpShiftService.resumeShift(interaction);
                    if (result.error) return interaction.editReply({ content: `❌ ${result.error}` });
                    return interaction.editReply({ content: '▶️ Turno retomado.' });
                } else {
                    const result = await hpShiftService.pauseShift(interaction);
                    if (result.error) return interaction.editReply({ content: `❌ ${result.error}` });
                    return interaction.editReply({ content: '⏸️ Turno pausado.' });
                }
            }

            // ── Encerrar Turno (pelo painel) ──────────────────────────
            if (action === 'end') {
                await interaction.deferReply({ ephemeral: true });
                const result = await hpShiftService.endShift(interaction);

                if (result.error) return interaction.editReply({ content: `❌ ${result.error}` });
                return interaction.editReply({ content: '🔴 Turno encerrado. O relatório foi gerado no canal de relatórios.' });
            }

            // ── Encerrar Turno (pelo embed do turno) ─────────────────
            if (action === 'end_from_embed') {
                await interaction.deferReply({ ephemeral: true });
                const result = await hpShiftService.endShift(interaction);

                if (result.error) return interaction.editReply({ content: `❌ ${result.error}` });
                return interaction.editReply({ content: '🔴 Turno encerrado. O relatório foi gerado no canal de relatórios.' });
            }

        } catch (err) {
            logger.error('Erro no painel do hospital', { action, guild: interaction.guildId, error: err.message });
            const reply = { content: '❌ Ocorreu um erro. Tente novamente.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};
