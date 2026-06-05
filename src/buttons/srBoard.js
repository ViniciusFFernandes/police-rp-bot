// Handles buttons on the Service Report board embed
const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    UserSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { isSupervisor, isAdmin } = require('../utils/permissions');
const srRepo          = require('../repositories/serviceReportRepository');
const srService       = require('../services/serviceReportService');
const guildConfigRepo = require('../repositories/guildConfigRepository');

// chave: `${guildId}:${userId}:${reportId}`
const pendingOfficers = new Map();
// chave: `${guildId}:${reportId}`
const pendingBoardEvidence = new Map();

module.exports = {
    customId: 'sr_board',

    async execute(interaction) {
        const parts    = interaction.customId.split(':');
        const action   = parts[1];
        const reportId = parts[2];

        // ── Verificação de permissão para ações de status ─────────────
        // Status buttons: supervisor, admin ou o próprio responsável pelo relatório
        const isStatusAction = ['finalize', 'resolve', 'archive'].includes(action);
        if (isStatusAction) {
            const report = await srRepo.findById(reportId, interaction.guildId);
            if (!report) return interaction.reply({ content: '❌ Relatório não encontrado.', ephemeral: true });

            const canChange = isAdmin(interaction.member)
                || await isSupervisor(interaction.member)
                || interaction.user.id === report.opened_by_discord_id;

            if (!canChange) {
                return interaction.reply({
                    content: '❌ Apenas o **responsável pelo relatório**, **supervisores** ou **administradores** podem alterar o status.',
                    ephemeral: true,
                });
            }

            const STATUS_MAP = { finalize: 'finalizado', resolve: 'resolvido', archive: 'arquivado' };
            const newStatus  = STATUS_MAP[action];
            await srRepo.updateStatus(reportId, interaction.guildId, newStatus);
            const updated = await srRepo.findById(reportId, interaction.guildId);
            await srService.refreshBoard(interaction.guild, updated);

            const LABEL = {
                finalizado: '🔵 Relatório marcado como **Finalizado**.',
                resolvido:  '✅ Crime marcado como **Resolvido**.',
                arquivado:  '📁 Relatório **Arquivado**.',
            };
            return interaction.reply({ content: LABEL[newStatus] || '✅ Status atualizado.', ephemeral: true });
        }

        // ── Adicionar oficial — etapa 1: select de usuário ───────────
        if (action === 'add_officers') {
            const officerSelect = new UserSelectMenuBuilder()
                .setCustomId(`sr_board:officers_select:${reportId}`)
                .setPlaceholder('Selecione o(s) oficial(is) a adicionar')
                .setMinValues(1)
                .setMaxValues(10);

            const confirmBtn = new ButtonBuilder()
                .setCustomId(`sr_board:officers_confirm:${reportId}`)
                .setLabel('Confirmar')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✅');

            return interaction.reply({
                content: '➕ Selecione o(s) oficial(is) a adicionar ao relatório:',
                components: [
                    new ActionRowBuilder().addComponents(officerSelect),
                    new ActionRowBuilder().addComponents(confirmBtn),
                ],
                ephemeral: true,
            });
        }

        // ── Adicionar oficial — seleção ───────────────────────────────
        if (action === 'officers_select') {
            pendingOfficers.set(`${interaction.guildId}:${interaction.user.id}:${reportId}`, interaction.values);
            return interaction.deferUpdate();
        }

        // ── Adicionar oficial — confirmar ─────────────────────────────
        if (action === 'officers_confirm') {
            const newIds = pendingOfficers.get(`${interaction.guildId}:${interaction.user.id}:${reportId}`);
            if (!newIds?.length) {
                return interaction.reply({ content: '❌ Selecione pelo menos um oficial antes de confirmar.', ephemeral: true });
            }

            pendingOfficers.delete(`${interaction.guildId}:${interaction.user.id}:${reportId}`);

            const report = await srRepo.findById(reportId, interaction.guildId);
            if (!report) return interaction.reply({ content: '❌ Relatório não encontrado.', ephemeral: true });

            let existing = [];
            try { existing = JSON.parse(report.involved_discord_ids); } catch { existing = []; }

            const merged = [...new Set([...existing, ...newIds])];
            await srRepo.updateInvolvedOfficers(reportId, interaction.guildId, merged);
            const updated = await srRepo.findById(reportId, interaction.guildId);
            await srService.refreshBoard(interaction.guild, updated);

            return interaction.reply({
                content: `✅ Oficial(is) adicionado(s): ${newIds.map(id => `<@${id}>`).join(', ')}`,
                ephemeral: true,
            });
        }

        // ── Editar descrição ──────────────────────────────────────────
        if (action === 'edit_description') {
            const report = await srRepo.findById(reportId, interaction.guildId);
            if (!report) return interaction.reply({ content: '❌ Relatório não encontrado.', ephemeral: true });

            const modal = new ModalBuilder()
                .setCustomId(`sr_board_edit:${reportId}`)
                .setTitle(`Editar Descrição — ${report.report_number}`);

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('description')
                        .setLabel('Descrição do Ocorrido')
                        .setStyle(TextInputStyle.Paragraph)
                        .setValue(report.description || '')
                        .setRequired(true)
                        .setMaxLength(2000)
                ),
            );

            return interaction.showModal(modal);
        }

        // ── Adicionar provas ao relatório existente ───────────────────
        if (action === 'add_evidence') {
            await interaction.deferReply({ ephemeral: true });

            const report = await srRepo.findById(reportId, interaction.guildId);
            if (!report) return interaction.editReply({ content: '❌ Relatório não encontrado.' });

            const categoryId = await guildConfigRepo.get(interaction.guildId, 'sr_category_id');
            if (!categoryId) {
                return interaction.editReply({
                    content: '❌ Categoria de relatórios não configurada. Use `/configurar categoria-sr`.',
                });
            }

            const channelName = `provas-${report.report_number.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

            const permissionOverwrites = [
                { id: interaction.guild.id,       deny:  ['ViewChannel'] },
                { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ManageMessages', 'ManageChannels'] },
                { id: interaction.user.id,        allow: ['ViewChannel', 'SendMessages', 'AttachFiles'] },
            ];

            const provasChannel = await interaction.guild.channels.create({
                name: channelName,
                type: 0,
                parent: categoryId,
                permissionOverwrites,
                topic: `Canal temporário de provas adicionais — ${report.report_number}`,
            });

            const collectionMsg = await provasChannel.send({
                content:
                    `📎 <@${interaction.user.id}>, envie as **novas provas** aqui (imagens, arquivos ou links de vídeo).\n` +
                    `Você pode enviar quantas mensagens precisar. Clique em **✅ Confirmar Provas** quando terminar.\n` +
                    `⚠️ Este canal será **deletado automaticamente** após a confirmação.`,
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`sr_board:board_evidence_confirm:${reportId}:${interaction.user.id}`)
                            .setLabel('✅ Confirmar Provas')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`sr_board:board_evidence_cancel:${reportId}:${interaction.user.id}`)
                            .setLabel('Cancelar')
                            .setStyle(ButtonStyle.Secondary),
                    ),
                ],
            });

            pendingBoardEvidence.set(`${interaction.guildId}:${reportId}`, {
                openerId:        interaction.user.id,
                provasChannelId: provasChannel.id,
                collectionMsgId: collectionMsg.id,
            });

            return interaction.editReply({
                content:
                    `📎 Canal criado: <#${provasChannel.id}>\n` +
                    `Envie suas provas lá e clique em **✅ Confirmar Provas** quando terminar.`,
            });
        }

        // ── Confirmar provas adicionais ───────────────────────────────
        // customId: sr_board:board_evidence_confirm:{reportId}:{openerId}
        if (action === 'board_evidence_confirm') {
            const rId      = parts[2];
            const openerId = parts[3];

            if (interaction.user.id !== openerId) {
                return interaction.reply({
                    content: '❌ Apenas o oficial que iniciou a coleta pode confirmar as provas.',
                    ephemeral: true,
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const pending = pendingBoardEvidence.get(`${interaction.guildId}:${rId}`);
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
            const evidenceChannelId = await guildConfigRepo.get(interaction.guildId, 'sr_evidence_channel_id');
            const evChannel         = evidenceChannelId
                ? (interaction.guild.channels.cache.get(evidenceChannelId) ?? await interaction.guild.channels.fetch(evidenceChannelId).catch(() => null))
                : null;

            if (evChannel && attachmentFiles.length > 0) {
                const report = await srRepo.findById(rId, interaction.guildId);
                const chunks = [];
                for (let i = 0; i < attachmentFiles.length; i += 10) chunks.push(attachmentFiles.slice(i, i + 10));

                for (const chunk of chunks) {
                    const sent = await evChannel.send({
                        content: chunks.indexOf(chunk) === 0 ? `📎 Provas adicionais — **${report?.report_number ?? rId}**` : null,
                        files: chunk.map(f => f.url),
                    });
                    for (const att of sent.attachments.values()) persistentUrls.push(att.url);
                }
            }

            const newEvidence = [...textParts, ...persistentUrls].join('\n');
            if (!newEvidence) {
                pendingBoardEvidence.delete(`${interaction.guildId}:${rId}`);
                const provasChannel = interaction.guild.channels.cache.get(pending.provasChannelId);
                if (provasChannel) await provasChannel.delete().catch(() => {});
                return interaction.editReply({ content: '⚠️ Nenhuma prova foi enviada. Canal removido.' });
            }

            await srRepo.appendEvidence(rId, interaction.guildId, newEvidence);
            const updated = await srRepo.findById(rId, interaction.guildId);
            await srService.refreshBoard(interaction.guild, updated);

            pendingBoardEvidence.delete(`${interaction.guildId}:${rId}`);
            const provasChannel = interaction.guild.channels.cache.get(pending.provasChannelId);
            if (provasChannel) await provasChannel.delete().catch(() => {});

            return interaction.editReply({ content: `✅ Provas adicionadas ao relatório **${updated.report_number}** com sucesso!` });
        }

        // ── Cancelar coleta de provas adicionais ──────────────────────
        // customId: sr_board:board_evidence_cancel:{reportId}:{openerId}
        if (action === 'board_evidence_cancel') {
            const rId      = parts[2];
            const openerId = parts[3];

            if (interaction.user.id !== openerId) {
                return interaction.reply({
                    content: '❌ Apenas o oficial que iniciou a coleta pode cancelar.',
                    ephemeral: true,
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const pending = pendingBoardEvidence.get(`${interaction.guildId}:${rId}`);
            pendingBoardEvidence.delete(`${interaction.guildId}:${rId}`);

            const provasChannel = interaction.guild.channels.cache.get(pending?.provasChannelId);
            if (provasChannel) await provasChannel.delete().catch(() => {});

            return interaction.editReply({ content: '❌ Coleta de provas cancelada. Nenhuma prova foi adicionada.' });
        }
    },
};
