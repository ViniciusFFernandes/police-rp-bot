// Handles buttons on the IA investigation board embed
const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { isIAStaff } = require('../utils/permissions');
const iaRepo          = require('../repositories/iaRepository');
const iaService       = require('../services/iaService');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { COLOR }       = require('../utils/embeds');

// chave: `${guildId}:${userId}:${invId}`
const pendingVerdicts = new Map();
// chave: `${guildId}:${userId}:${invId}`
const pendingAccused  = new Map();
// chave: `${guildId}:${invId}` — para o fluxo de provas em caso existente
const pendingBoardEvidence = new Map();

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

        // ── Adicionar acusado — etapa 1: select de usuário ───────────
        if (action === 'add_accused') {
            const officerSelect = new UserSelectMenuBuilder()
                .setCustomId(`ia_board:accused_select:${invId}`)
                .setPlaceholder('Selecione o(s) acusado(s) a adicionar')
                .setMinValues(1)
                .setMaxValues(10);

            const confirmBtn = new ButtonBuilder()
                .setCustomId(`ia_board:accused_confirm:${invId}`)
                .setLabel('Confirmar')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✅');

            return interaction.reply({
                content: '➕ Selecione o(s) oficial(is) a adicionar como acusado(s):',
                components: [
                    new ActionRowBuilder().addComponents(officerSelect),
                    new ActionRowBuilder().addComponents(confirmBtn),
                ],
                ephemeral: true,
            });
        }

        // ── Adicionar acusado — seleção ───────────────────────────────
        if (action === 'accused_select') {
            pendingAccused.set(`${interaction.guildId}:${interaction.user.id}:${invId}`, interaction.values);
            return interaction.deferUpdate();
        }

        // ── Adicionar acusado — confirmar ─────────────────────────────
        if (action === 'accused_confirm') {
            const newIds = pendingAccused.get(`${interaction.guildId}:${interaction.user.id}:${invId}`);
            if (!newIds?.length) {
                return interaction.reply({ content: '❌ Selecione pelo menos um oficial antes de confirmar.', ephemeral: true });
            }

            pendingAccused.delete(`${interaction.guildId}:${interaction.user.id}:${invId}`);

            const inv = await iaRepo.findById(invId, interaction.guildId);
            if (!inv) return interaction.reply({ content: '❌ Investigação não encontrada.', ephemeral: true });

            let existing = [];
            if (inv.additional_involved_ids) {
                try { existing = JSON.parse(inv.additional_involved_ids); } catch { existing = []; }
            }

            // Evita duplicatas (não adiciona quem já é acusado principal ou já está na lista)
            const primaryId = inv.involved_discord_id;
            const merged = [...new Set([...existing, ...newIds.filter(id => id !== primaryId)])];

            await iaRepo.updateAdditionalAccused(invId, interaction.guildId, merged);
            const updated = await iaRepo.findById(invId, interaction.guildId);
            await iaService.refreshBoard(interaction.guild, updated);

            return interaction.reply({
                content: `✅ Acusado(s) adicionado(s): ${newIds.map(id => `<@${id}>`).join(', ')}`,
                ephemeral: true,
            });
        }

        // ── Editar descrição ──────────────────────────────────────────
        if (action === 'edit_description') {
            const inv = await iaRepo.findById(invId, interaction.guildId);
            if (!inv) return interaction.reply({ content: '❌ Investigação não encontrada.', ephemeral: true });

            const modal = new ModalBuilder()
                .setCustomId(`ia_board_edit:${invId}`)
                .setTitle(`Editar Descrição — ${inv.case_number}`);

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('description')
                        .setLabel('Descrição do Ocorrido')
                        .setStyle(TextInputStyle.Paragraph)
                        .setValue(inv.description || '')
                        .setRequired(true)
                        .setMaxLength(2000)
                ),
            );

            return interaction.showModal(modal);
        }

        // ── Adicionar provas ao caso existente — cria canal temporário ─
        if (action === 'add_evidence') {
            await interaction.deferReply({ ephemeral: true });

            const inv = await iaRepo.findById(invId, interaction.guildId);
            if (!inv) return interaction.editReply({ content: '❌ Investigação não encontrada.' });

            const categoryId = await guildConfigRepo.get(interaction.guildId, 'ia_category_id');
            if (!categoryId) {
                return interaction.editReply({
                    content: '❌ Categoria de IA não configurada. Use `/configurar categoria-ia`.',
                });
            }

            const iaRoleIdsRaw = await guildConfigRepo.get(interaction.guildId, 'ia_role_ids');
            const iaRoleIds    = iaRoleIdsRaw ? JSON.parse(iaRoleIdsRaw) : [];

            const channelName = `provas-${inv.case_number.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

            const permissionOverwrites = [
                { id: interaction.guild.id,       deny:  ['ViewChannel'] },
                { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ManageMessages', 'ManageChannels'] },
                { id: interaction.user.id,        allow: ['ViewChannel', 'SendMessages', 'AttachFiles'] },
                ...iaRoleIds.map(id => ({ id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles'] })),
            ];

            const provasChannel = await interaction.guild.channels.create({
                name: channelName,
                type: 0,
                parent: categoryId,
                permissionOverwrites,
                topic: `Canal temporário de provas adicionais — ${inv.case_number}`,
            });

            const collectionMsg = await provasChannel.send({
                content:
                    `📎 <@${interaction.user.id}>, envie as **novas provas** aqui (imagens, arquivos ou links de vídeo).\n` +
                    `Você pode enviar quantas mensagens precisar. Clique em **✅ Confirmar Provas** quando terminar.\n` +
                    `⚠️ Este canal será **deletado automaticamente** após a confirmação.`,
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ia_board:board_evidence_confirm:${invId}:${interaction.user.id}`)
                            .setLabel('✅ Confirmar Provas')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`ia_board:board_evidence_cancel:${invId}:${interaction.user.id}`)
                            .setLabel('Cancelar')
                            .setStyle(ButtonStyle.Secondary),
                    ),
                ],
            });

            pendingBoardEvidence.set(`${interaction.guildId}:${invId}`, {
                openerId:       interaction.user.id,
                provasChannelId: provasChannel.id,
                collectionMsgId: collectionMsg.id,
            });

            return interaction.editReply({
                content:
                    `📎 Canal criado: <#${provasChannel.id}>\n` +
                    `Envie suas provas lá e clique em **✅ Confirmar Provas** quando terminar.`,
            });
        }

        // ── Confirmar provas adicionais ao caso existente ─────────────
        // customId: ia_board:board_evidence_confirm:{invId}:{openerId}
        if (action === 'board_evidence_confirm') {
            const invIdFromBtn = parts[2];
            const openerId     = parts[3];

            if (interaction.user.id !== openerId) {
                return interaction.reply({
                    content: '❌ Apenas o oficial que iniciou a coleta pode confirmar as provas.',
                    ephemeral: true,
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const pending = pendingBoardEvidence.get(`${interaction.guildId}:${invIdFromBtn}`);
            if (!pending) {
                return interaction.editReply({ content: '❌ Sessão expirada. Inicie novamente pelo botão **Adicionar Provas**.' });
            }

            const collectionMsgId = pending.collectionMsgId;
            const userMessages    = collectionMsgId
                ? (await interaction.channel.messages.fetch({ after: collectionMsgId, limit: 100 }))
                      .filter(m => m.author.id === openerId && !m.author.bot)
                : new Map();

            const textParts       = [];
            const attachmentFiles = [];
            for (const msg of userMessages.values()) {
                if (msg.content.trim()) textParts.push(msg.content.trim());
                for (const att of msg.attachments.values()) {
                    attachmentFiles.push({ url: att.url, name: att.name });
                }
            }

            const persistentUrls    = [];
            const evidenceChannelId = await guildConfigRepo.get(interaction.guildId, 'ia_evidence_channel_id');
            const iaChannel         = evidenceChannelId
                ? (interaction.guild.channels.cache.get(evidenceChannelId) ?? await interaction.guild.channels.fetch(evidenceChannelId).catch(() => null))
                : null;

            if (iaChannel && attachmentFiles.length > 0) {
                const inv    = await iaRepo.findById(invIdFromBtn, interaction.guildId);
                const chunks = [];
                for (let i = 0; i < attachmentFiles.length; i += 10) chunks.push(attachmentFiles.slice(i, i + 10));

                for (const chunk of chunks) {
                    const sent = await iaChannel.send({
                        content: chunks.indexOf(chunk) === 0 ? `📎 Provas adicionais — **${inv?.case_number ?? invIdFromBtn}**` : null,
                        files: chunk.map(f => f.url),
                    });
                    for (const att of sent.attachments.values()) persistentUrls.push(att.url);
                }
            }

            const newEvidence = [...textParts, ...persistentUrls].join('\n');

            pendingBoardEvidence.delete(`${interaction.guildId}:${invIdFromBtn}`);
            const provasChannel = interaction.guild.channels.cache.get(pending.provasChannelId);

            if (!newEvidence) {
                await interaction.editReply({ content: '⚠️ Nenhuma prova foi enviada. Canal removido.' });
                if (provasChannel) await provasChannel.delete().catch(() => {});
                return;
            }

            await iaRepo.appendEvidence(invIdFromBtn, interaction.guildId, newEvidence);
            const updated = await iaRepo.findById(invIdFromBtn, interaction.guildId);
            await iaService.refreshBoard(interaction.guild, updated);

            await interaction.editReply({ content: `✅ Provas adicionadas ao caso **${updated.case_number}** com sucesso!` });
            if (provasChannel) await provasChannel.delete().catch(() => {});
        }

        // ── Cancelar coleta de provas adicionais ──────────────────────
        // customId: ia_board:board_evidence_cancel:{invId}:{openerId}
        if (action === 'board_evidence_cancel') {
            const invIdFromBtn = parts[2];
            const openerId     = parts[3];

            if (interaction.user.id !== openerId) {
                return interaction.reply({
                    content: '❌ Apenas o oficial que iniciou a coleta pode cancelar.',
                    ephemeral: true,
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const pending = pendingBoardEvidence.get(`${interaction.guildId}:${invIdFromBtn}`);
            pendingBoardEvidence.delete(`${interaction.guildId}:${invIdFromBtn}`);

            await interaction.editReply({ content: '❌ Coleta de provas cancelada. Nenhuma prova foi adicionada.' });
            const provasChannel = interaction.guild.channels.cache.get(pending?.provasChannelId);
            if (provasChannel) await provasChannel.delete().catch(() => {});
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
