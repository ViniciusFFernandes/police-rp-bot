// Handles buttons on the IA investigation board embed
const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { isIAStaff } = require('../utils/permissions');
const iaRepo    = require('../repositories/iaRepository');
const iaService = require('../services/iaService');
const { COLOR } = require('../utils/embeds');

// Armazena o veredicto selecionado enquanto o usuário ainda não confirmou
// chave: `${guildId}:${userId}:${invId}`
const pendingVerdicts = new Map();

const VERDICT_OPTIONS = [
    {
        label: '✅ Sustentado',
        value: 'sustained',
        description: 'A infração foi provada e as evidências sustentam a acusação',
    },
    {
        label: '⚠️ Não Sustentado',
        value: 'not_sustained',
        description: 'Não há provas suficientes para provar ou refutar',
    },
    {
        label: '🔵 Exonerado',
        value: 'exonerated',
        description: 'O fato ocorreu, mas a ação foi legal e dentro do protocolo',
    },
    {
        label: '❌ Infundado',
        value: 'unfounded',
        description: 'O fato alegado não ocorreu ou é comprovadamente falso',
    },
];

module.exports = {
    customId: 'ia_board',

    async execute(interaction) {
        if (!await isIAStaff(interaction.member)) {
            return interaction.reply({ content: '❌ Sem permissão para gerenciar investigações internas.', ephemeral: true });
        }

        const parts  = interaction.customId.split(':');
        const action = parts[1];
        const invId  = parts[2];

        // ── Alterar status — botão Ativar ────────────────────────────
        if (action === 'status_active' || action === 'status_suspended') {
            const newStatus = action === 'status_active' ? 'active' : 'suspended';
            const inv = await iaRepo.findById(invId, interaction.guildId);
            if (!inv) return interaction.reply({ content: '❌ Investigação não encontrada.', ephemeral: true });

            await iaRepo.updateStatus(invId, interaction.guildId, newStatus);
            const updated = await iaRepo.findById(invId, interaction.guildId);
            await iaService.refreshBoard(interaction.guild, updated);
            return interaction.reply({
                content: `✅ Status alterado para **${newStatus === 'active' ? 'Ativa' : 'Suspensa'}**.`,
                ephemeral: true,
            });
        }

        // ── Encerrar — etapa 1: mostrar select de veredicto ─────────
        if (action === 'close') {
            const verdictSelect = new StringSelectMenuBuilder()
                .setCustomId(`ia_board:verdict_select:${invId}`)
                .setPlaceholder('Selecione o veredicto da investigação')
                .addOptions(VERDICT_OPTIONS);

            const embed = new EmbedBuilder()
                .setColor(COLOR.LOSS)
                .setTitle('🔴 Encerrar Investigação')
                .setDescription('Selecione o **veredicto** abaixo e clique em **Confirmar** para prosseguir.\nVocê poderá informar a recomendação de penalidade na próxima etapa.');

            const confirmBtn = new ButtonBuilder()
                .setCustomId(`ia_board:close_confirm:${invId}`)
                .setLabel('Confirmar →')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔴');

            return interaction.reply({
                embeds: [embed],
                components: [
                    new ActionRowBuilder().addComponents(verdictSelect),
                    new ActionRowBuilder().addComponents(confirmBtn),
                ],
                ephemeral: true,
            });
        }

        // ── Encerrar — seleção de veredicto ─────────────────────────
        if (action === 'verdict_select') {
            const verdict = interaction.values[0];
            pendingVerdicts.set(`${interaction.guildId}:${interaction.user.id}:${invId}`, verdict);
            return interaction.deferUpdate();
        }

        // ── Encerrar — etapa 2: modal de penalidade ─────────────────
        if (action === 'close_confirm') {
            const verdict = pendingVerdicts.get(`${interaction.guildId}:${interaction.user.id}:${invId}`);
            if (!verdict) {
                return interaction.reply({
                    content: '❌ Selecione o **veredicto** antes de confirmar.',
                    ephemeral: true,
                });
            }

            const modal = new ModalBuilder()
                .setCustomId(`ia_close:${invId}:${verdict}`)
                .setTitle('Encerrar — Recomendação de Penalidade');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('penalty_recommendation')
                        .setLabel('Recomendação de Penalidade (opcional)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Ex: Suspensão de 15 dias, Demissão por justa causa, Advertência formal...')
                        .setRequired(false)
                        .setMaxLength(1000)
                ),
            );

            return interaction.showModal(modal);
        }

        // ── Status de aplicação da penalidade ────────────────────────
        if (action === 'penalty') {
            const penaltyStatus = parts[3];
            const inv = await iaRepo.findById(invId, interaction.guildId);
            if (!inv) return interaction.reply({ content: '❌ Investigação não encontrada.', ephemeral: true });

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
