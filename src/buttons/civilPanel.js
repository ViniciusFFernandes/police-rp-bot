const {
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const complaintRepo = require('../repositories/civilComplaintRepository');
const civilComplaintService = require('../services/civilComplaintService');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const pendingComplaint = require('../utils/pendingCivilComplaint');
const { collectEvidence } = require('../utils/collectEvidence');
const { COLOR } = require('../utils/embeds');
const logger = require('../utils/logger');

const STATUS_LABEL = {
    pending:  '🟡 Aguardando avaliação',
    accepted: '✅ Aceita — investigação a ser aberta',
    rejected: '❌ Arquivada',
};

module.exports = {
    customId: 'civilpanel',

    async execute(interaction) {
        const [, action] = interaction.customId.split(':');

        if (action === 'denunciar') {
            const modal = new ModalBuilder()
                .setCustomId('modal:civil_complaint')
                .setTitle('Registrar Denúncia');

            const nameInput = new TextInputBuilder()
                .setCustomId('complainant_name')
                .setLabel('Seu nome (deixe em branco para anônima)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(100);

            const subjectInput = new TextInputBuilder()
                .setCustomId('subject')
                .setLabel('Assunto / Policial envolvido')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(150);

            const descriptionInput = new TextInputBuilder()
                .setCustomId('description')
                .setLabel('Descreva o ocorrido')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1500);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(subjectInput),
                new ActionRowBuilder().addComponents(descriptionInput),
            );

            return interaction.showModal(modal);
        }

        if (action === 'minhas') {
            await interaction.deferReply({ ephemeral: true });

            const complaints = await complaintRepo.listByComplainant(interaction.guildId, interaction.user.id);
            if (complaints.length === 0) {
                return interaction.editReply({
                    content:
                        '📂 Você ainda não possui denúncias identificadas registradas.\n' +
                        '⚠️ Denúncias feitas anonimamente não aparecem aqui, pois não ficam vinculadas ao seu usuário.',
                });
            }

            const embed = new EmbedBuilder()
                .setColor(COLOR.INFO)
                .setTitle('📂 Minhas Denúncias')
                .setDescription(
                    complaints.map(c =>
                        `**${c.complaint_number}** — ${STATUS_LABEL[c.status] || c.status}\n` +
                        `📌 ${c.subject || '—'}`
                    ).join('\n\n')
                );

            return interaction.editReply({ embeds: [embed] });
        }

        // ── Cria relatório sem provas ─────────────────────────────────
        if (action === 'evidence_skip') {
            await interaction.deferUpdate();
            return submitComplaint(interaction, interaction.user.id, null);
        }

        // ── Cria canal temporário de provas ───────────────────────────
        if (action === 'evidence_add') {
            await interaction.deferUpdate();

            const categoryId = await guildConfigRepo.get(interaction.guildId, 'civil_complaints_category_id');
            if (!categoryId) {
                return interaction.editReply({
                    content: '❌ Categoria de provas não configurada. Peça a um administrador para configurar ou envie sua denúncia sem provas.',
                    components: [],
                });
            }

            const pending = pendingComplaint.get(interaction.guildId, interaction.user.id);
            if (!pending) {
                return interaction.editReply({ content: '❌ Sessão expirada. Registre a denúncia novamente.', components: [] });
            }

            const nextNum     = pending.reservedComplaintNumber ?? await complaintRepo.nextComplaintNumber(interaction.guildId);
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
                    `📎 <@${interaction.user.id}>, envie as **provas** da sua denúncia aqui (imagens, arquivos ou links de vídeo).\n` +
                    `Você pode enviar quantas mensagens precisar. Clique em **✅ Confirmar Provas** quando terminar.\n` +
                    `⚠️ Este canal será **deletado automaticamente** após a confirmação.`,
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`civilpanel:evidence_confirm:${interaction.user.id}`)
                            .setLabel('✅ Confirmar Provas')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`civilpanel:evidence_cancel:${interaction.user.id}`)
                            .setLabel('Cancelar')
                            .setStyle(ButtonStyle.Secondary),
                    ),
                ],
            });

            pendingComplaint.set(interaction.guildId, interaction.user.id, {
                collectionMsgId:         collectionMsg.id,
                provasChannelId:         provasChannel.id,
                reservedComplaintNumber: nextNum,
            });

            return interaction.editReply({
                content:
                    `📎 Canal criado: <#${provasChannel.id}>\n` +
                    `Envie suas provas lá e clique em **✅ Confirmar Provas** quando terminar.`,
                components: [],
            });
        }

        // ── Confirma e registra a denúncia com as provas coletadas ────
        // customId: civilpanel:evidence_confirm:{authorId}
        if (action === 'evidence_confirm') {
            const authorId = interaction.customId.split(':')[2];

            if (interaction.user.id !== authorId) {
                return interaction.reply({ content: '❌ Apenas quem registrou a denúncia pode confirmar as provas.', ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: true });

            const pending = pendingComplaint.get(interaction.guildId, authorId);
            if (!pending?.subject) {
                return interaction.editReply({ content: '❌ Sessão expirada. A denúncia precisará ser registrada novamente.' });
            }

            const archiveChannelId = await guildConfigRepo.get(interaction.guildId, 'civil_evidence_channel_id');
            const evidence = await collectEvidence({
                guild:            interaction.guild,
                provasChannelId:  pending.provasChannelId,
                collectionMsgId:  pending.collectionMsgId,
                openerId:         authorId,
                archiveChannelId,
                label:            pending.reservedComplaintNumber ?? '—',
            });

            await submitComplaint(interaction, authorId, evidence);

            const provasChannel = interaction.guild.channels.cache.get(pending.provasChannelId);
            if (provasChannel) provasChannel.delete().catch(() => {});
        }

        // ── Cancela coleta de provas ──────────────────────────────────
        // customId: civilpanel:evidence_cancel:{authorId}
        if (action === 'evidence_cancel') {
            const authorId = interaction.customId.split(':')[2];

            if (interaction.user.id !== authorId) {
                return interaction.reply({ content: '❌ Apenas quem registrou a denúncia pode cancelar.', ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: true });

            const pending = pendingComplaint.get(interaction.guildId, authorId);
            pendingComplaint.clear(interaction.guildId, authorId);

            await interaction.editReply({ content: '❌ Coleta de provas cancelada. A denúncia **não** foi registrada.' });

            const provasChannel = interaction.guild.channels.cache.get(pending?.provasChannelId);
            if (provasChannel) provasChannel.delete().catch(() => {});
        }
    },
};

// ── Helper: registra a denúncia e publica o card de avaliação ────────────────
async function submitComplaint(interaction, authorId, evidence) {
    try {
        const pending = pendingComplaint.get(interaction.guildId, authorId);
        if (!pending?.subject) {
            const msg = { content: '❌ Sessão expirada. A denúncia precisará ser registrada novamente.', components: [] };
            if (interaction.replied || interaction.deferred) return interaction.editReply(msg);
            return interaction.reply({ ...msg, ephemeral: true });
        }

        const complaintNumber = pending.reservedComplaintNumber ?? await complaintRepo.nextComplaintNumber(interaction.guildId);

        const complaint = await complaintRepo.create({
            guildId:               interaction.guildId,
            complaintNumber,
            isAnonymous:           pending.isAnonymous,
            complainantDiscordId:  pending.isAnonymous ? null : authorId,
            complainantName:       pending.complainantName,
            subject:               pending.subject,
            description:           pending.description,
            evidence,
        });

        pendingComplaint.clear(interaction.guildId, authorId);

        await civilComplaintService.postReviewCard(interaction.guild, complaint);

        const note = pending.isAnonymous
            ? '🕵️ Sua denúncia foi registrada **anonimamente**. Como não está vinculada ao seu usuário, ela **não poderá ser consultada** posteriormente em "Minhas Denúncias".'
            : `📂 Sua denúncia foi registrada e vinculada ao seu usuário. Você pode consultá-la depois em **Minhas Denúncias** pelo número **${complaintNumber}**.`;

        const msg = {
            content: `✅ Denúncia **${complaintNumber}** registrada com sucesso e encaminhada à Corregedoria para avaliação.\n\n${note}`,
            components: [],
        };
        if (interaction.replied || interaction.deferred) return interaction.editReply(msg);
        return interaction.reply({ ...msg, ephemeral: true });
    } catch (err) {
        logger.error('Erro ao registrar denúncia civil', { guild: interaction.guildId, error: err.message });
        const msg = { content: '❌ Erro ao registrar a denúncia. Tente novamente.', components: [] };
        if (interaction.replied || interaction.deferred) return interaction.editReply(msg);
        return interaction.reply({ ...msg, ephemeral: true });
    }
}
