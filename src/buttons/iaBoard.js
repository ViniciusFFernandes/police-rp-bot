// Handles buttons/selects on the IA investigation board embed
const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require('discord.js');
const { isAdmin, isSupervisor } = require('../utils/permissions');
const iaRepo    = require('../repositories/iaRepository');
const iaService = require('../services/iaService');

module.exports = {
    customId: 'ia_board',

    async execute(interaction) {
        if (!isAdmin(interaction.member) && !await isSupervisor(interaction.member)) {
            return interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
        }

        const parts  = interaction.customId.split(':');
        const action = parts[1];
        const invId  = parts[2];

        const inv = await iaRepo.findById(invId, interaction.guildId);
        if (!inv) {
            return interaction.reply({ content: '❌ Investigação não encontrada.', ephemeral: true });
        }

        // ── Alterar status ───────────────────────────────────────────
        if (action === 'status') {
            const newStatus = interaction.values[0];
            await iaRepo.updateStatus(invId, interaction.guildId, newStatus);
            const updated = await iaRepo.findById(invId, interaction.guildId);
            await iaService.refreshBoard(interaction.guild, updated);
            return interaction.reply({
                content: `✅ Status alterado para **${newStatus === 'active' ? 'Ativa' : 'Suspensa'}**.`,
                ephemeral: true,
            });
        }

        // ── Encerrar investigação ────────────────────────────────────
        if (action === 'close') {
            const modal = new ModalBuilder()
                .setCustomId(`ia_close:${invId}`)
                .setTitle('Encerrar Investigação');

            const verdictSelect = new TextInputBuilder()
                .setCustomId('verdict')
                .setLabel('Veredicto (escreva exatamente uma opção)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('sustained | not_sustained | exonerated | unfounded')
                .setRequired(true)
                .setMaxLength(20);

            const penaltyInput = new TextInputBuilder()
                .setCustomId('penalty_recommendation')
                .setLabel('Recomendação de Penalidade')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Descreva a penalidade recomendada (suspensão, demissão, advertência, etc.)')
                .setRequired(false)
                .setMaxLength(1000);

            modal.addComponents(
                new ActionRowBuilder().addComponents(verdictSelect),
                new ActionRowBuilder().addComponents(penaltyInput),
            );

            return interaction.showModal(modal);
        }

        // ── Status de aplicação da penalidade ────────────────────────
        if (action === 'penalty') {
            const penaltyStatus = parts[3]; // applied | not_applied | applied_modified
            await iaRepo.updatePenaltyStatus(invId, interaction.guildId, penaltyStatus);
            const updated = await iaRepo.findById(invId, interaction.guildId);
            await iaService.refreshBoard(interaction.guild, updated);

            const LABEL = {
                applied:          '✅ Penalidade marcada como **Aplicada**.',
                not_applied:      '❌ Penalidade marcada como **Não Aplicada**.',
                applied_modified: '🔶 Penalidade marcada como **Aplicada com Modificações**.',
            };
            return interaction.reply({ content: LABEL[penaltyStatus] || '✅ Atualizado.', ephemeral: true });
        }
    },
};
