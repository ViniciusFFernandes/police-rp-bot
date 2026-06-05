// Handles buttons during the SR (Service Report) creation flow
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const pendingSR       = require('../utils/pendingSR');
const srRepo          = require('../repositories/serviceReportRepository');
const srService       = require('../services/serviceReportService');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { COLOR }       = require('../utils/embeds');
const logger          = require('../utils/logger');

module.exports = {
    customId: 'sr',

    async execute(interaction) {
        const parts  = interaction.customId.split(':');
        const action = parts[1];

        // ── Seleção do tipo de relatório ─────────────────────────────
        if (action === 'type') {
            const pending = pendingSR.get(interaction.guildId, interaction.user.id) || {};
            pendingSR.setStep1(interaction.guildId, interaction.user.id, interaction.values[0], pending.involvedDiscordIds);
            return interaction.deferUpdate();
        }

        // ── Seleção de outros oficiais envolvidos ────────────────────
        if (action === 'officers') {
            const pending = pendingSR.get(interaction.guildId, interaction.user.id) || {};
            pendingSR.setStep1(interaction.guildId, interaction.user.id, pending.type, interaction.values);
            return interaction.deferUpdate();
        }

        // ── Continuar: abre modal de detalhes ────────────────────────
        if (action === 'step2') {
            const pending = pendingSR.get(interaction.guildId, interaction.user.id);
            if (!pending?.type) {
                return interaction.reply({ content: '❌ Selecione o **tipo** de relatório antes de continuar.', ephemeral: true });
            }

            const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
            const modal = new ModalBuilder()
                .setCustomId('sr_details')
                .setTitle('Relatório de Serviço — Detalhes');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('incident_location')
                        .setLabel('Local do Incidente')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ex: Rua das Flores, 123 — Bairro Centro')
                        .setRequired(false)
                        .setMaxLength(200)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('incident_datetime')
                        .setLabel('Data e Hora (DD/MM/AAAA HH:MM)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ex: 04/06/2026 14:30')
                        .setRequired(false)
                        .setMaxLength(20)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('description')
                        .setLabel('Descrição do Ocorrido')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Descreva detalhadamente o que ocorreu...')
                        .setRequired(true)
                        .setMaxLength(2000)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('suspects')
                        .setLabel('Suspeitos / Envolvidos Civis (opcional)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Nome, descrição física, veículo, documentos...')
                        .setRequired(false)
                        .setMaxLength(1000)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('seized_items')
                        .setLabel('Itens Apreendidos (opcional)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ex: 1 pistola Glock, 50g de entorpecente, R$ 2.000,00')
                        .setRequired(false)
                        .setMaxLength(500)
                ),
            );

            return interaction.showModal(modal);
        }

        // ── Criar relatório sem provas ────────────────────────────────
        if (action === 'evidence_skip') {
            await interaction.deferUpdate();
            return createReport(interaction, interaction.user.id, null);
        }

        // ── Cria canal temporário de provas ──────────────────────────
        if (action === 'evidence_add') {
            await interaction.deferUpdate();

            const categoryId = await guildConfigRepo.get(interaction.guildId, 'sr_category_id');
            if (!categoryId) {
                return interaction.editReply({
                    content: '❌ Categoria de relatórios não configurada. Use `/configurar categoria-sr` ou crie o relatório sem provas.',
                    components: [],
                });
            }

            const pending    = pendingSR.get(interaction.guildId, interaction.user.id);
            const nextNum    = pending.reservedReportNumber ?? await srRepo.nextReportNumber(interaction.guildId);
            const channelName = `provas-${nextNum.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

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
                topic: `Canal temporário de coleta de provas — ${nextNum}`,
            });

            const collectionMsg = await provasChannel.send({
                content:
                    `📎 <@${interaction.user.id}>, envie as **provas** aqui (imagens, arquivos ou links de vídeo).\n` +
                    `Você pode enviar quantas mensagens precisar. Clique em **✅ Confirmar Provas** quando terminar.\n` +
                    `⚠️ Este canal será **deletado automaticamente** após a confirmação.`,
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`sr:evidence_confirm:${interaction.user.id}`)
                            .setLabel('✅ Confirmar Provas')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`sr:evidence_cancel:${interaction.user.id}`)
                            .setLabel('Cancelar')
                            .setStyle(ButtonStyle.Secondary),
                    ),
                ],
            });

            pendingSR.setStep2(interaction.guildId, interaction.user.id, {
                collectionMsgId:      collectionMsg.id,
                provasChannelId:      provasChannel.id,
                reservedReportNumber: nextNum,
            });

            return interaction.editReply({
                content:
                    `📎 Canal criado: <#${provasChannel.id}>\n` +
                    `Envie suas provas lá e clique em **✅ Confirmar Provas** quando terminar.`,
                components: [],
            });
        }

        // ── Confirma e cria relatório com as provas coletadas ─────────
        // customId: sr:evidence_confirm:{openerId}
        if (action === 'evidence_confirm') {
            const openerId = parts[2];

            if (interaction.user.id !== openerId) {
                return interaction.reply({
                    content: '❌ Apenas o oficial que abriu o relatório pode confirmar as provas.',
                    ephemeral: true,
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const pending = pendingSR.get(interaction.guildId, openerId);
            if (!pending?.type) {
                return interaction.editReply({ content: '❌ Sessão expirada. O relatório precisará ser reaberto.' });
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
                const reportNum = pending.reservedReportNumber ?? '—';
                const chunks    = [];
                for (let i = 0; i < attachmentFiles.length; i += 10) chunks.push(attachmentFiles.slice(i, i + 10));

                for (const chunk of chunks) {
                    const sent = await evChannel.send({
                        content: chunks.indexOf(chunk) === 0 ? `📎 Provas — **${reportNum}**` : null,
                        files: chunk.map(f => f.url),
                    });
                    for (const att of sent.attachments.values()) persistentUrls.push(att.url);
                }
            }

            const evidenceParts = [...textParts, ...persistentUrls];
            const evidence      = evidenceParts.length > 0 ? evidenceParts.join('\n') : null;

            await createReport(interaction, openerId, evidence);

            const provasChannel = interaction.guild.channels.cache.get(pending.provasChannelId);
            if (provasChannel) await provasChannel.delete().catch(() => {});
        }

        // ── Cancela coleta de provas ──────────────────────────────────
        // customId: sr:evidence_cancel:{openerId}
        if (action === 'evidence_cancel') {
            const openerId = parts[2];

            if (interaction.user.id !== openerId) {
                return interaction.reply({
                    content: '❌ Apenas o oficial que abriu o relatório pode cancelar.',
                    ephemeral: true,
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const pending = pendingSR.get(interaction.guildId, openerId);
            pendingSR.clear(interaction.guildId, openerId);

            const provasChannel = interaction.guild.channels.cache.get(pending?.provasChannelId);
            if (provasChannel) await provasChannel.delete().catch(() => {});

            return interaction.editReply({
                content: '❌ Coleta de provas cancelada. O relatório **não** foi criado.',
            });
        }
    },
};

// ── Helper: cria o relatório e publica o quadro ──────────────────────────────
async function createReport(interaction, openerId, evidence) {
    try {
        const pending = pendingSR.get(interaction.guildId, openerId);
        if (!pending?.type) {
            const msg = { content: '❌ Sessão expirada. O relatório precisará ser reaberto.', components: [] };
            if (interaction.replied || interaction.deferred) return interaction.editReply(msg);
            return interaction.reply({ ...msg, ephemeral: true });
        }

        const reportNumber = pending.reservedReportNumber ?? await srRepo.nextReportNumber(interaction.guildId);

        // opener sempre é o primeiro dos envolvidos
        const allInvolved = [openerId, ...pending.involvedDiscordIds.filter(id => id !== openerId)];

        const report = await srRepo.create({
            guildId:             interaction.guildId,
            reportNumber,
            type:                pending.type,
            openedByDiscordId:   openerId,
            involvedDiscordIds:  allInvolved,
            incidentLocation:    pending.incidentLocation,
            incidentDate:        pending.incidentDate,
            incidentTime:        pending.incidentTime,
            description:         pending.description,
            suspects:            pending.suspects,
            seizedItems:         pending.seizedItems,
            evidence,
        });

        pendingSR.clear(interaction.guildId, openerId);

        const board = await srService.postBoard(interaction.guild, report);
        const boardNote = board
            ? 'O relatório foi publicado no canal de serviço.'
            : '⚠️ Relatório criado, mas o quadro não pôde ser publicado — verifique as permissões do canal de SR.';

        const msg = {
            content: `✅ **Relatório ${reportNumber} aberto com sucesso!**\n${boardNote}`,
            components: [],
        };
        if (interaction.replied || interaction.deferred) return interaction.editReply(msg);
        return interaction.reply({ ...msg, ephemeral: true });
    } catch (err) {
        logger.error('Erro ao criar relatório de serviço', { guild: interaction.guildId, error: err.message });
        const msg = { content: '❌ Erro ao criar o relatório. Tente novamente.', components: [] };
        if (interaction.replied || interaction.deferred) return interaction.editReply(msg);
        return interaction.reply({ ...msg, ephemeral: true });
    }
}
