// Handles buttons during the IA investigation opening flow (steps 1→2→3 + evidence)
const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { isIAStaff } = require('../utils/permissions');
const pendingIA         = require('../utils/pendingIA');
const iaRepo            = require('../repositories/iaRepository');
const iaService         = require('../services/iaService');
const officialRepo      = require('../repositories/officialProfileRepository');
const guildConfigRepo   = require('../repositories/guildConfigRepository');
const { COLOR }         = require('../utils/embeds');
const logger            = require('../utils/logger');

module.exports = {
    customId: 'ia',

    async execute(interaction) {
        if (!await isIAStaff(interaction.member)) {
            return interaction.reply({ content: '❌ Sem permissão para gerenciar investigações internas.', ephemeral: true });
        }

        const parts  = interaction.customId.split(':');
        const action = parts[1];

        // ── Seleção de origem ────────────────────────────────────────
        if (action === 'origin') {
            const origin = interaction.values[0];
            pendingIA.setStep1(interaction.guildId, interaction.user.id, origin, null);
            return interaction.deferUpdate();
        }

        // ── Seleção do oficial envolvido ─────────────────────────────
        if (action === 'involved') {
            const pending = pendingIA.get(interaction.guildId, interaction.user.id) || {};
            pendingIA.setStep1(interaction.guildId, interaction.user.id, pending.origin, interaction.values[0]);
            return interaction.deferUpdate();
        }

        // ── Etapa 2: abre modal de detalhes do incidente ─────────────
        if (action === 'step2') {
            const pending = pendingIA.get(interaction.guildId, interaction.user.id);

            if (!pending?.origin) {
                return interaction.reply({ content: '❌ Selecione a **origem** da investigação.', ephemeral: true });
            }
            if (!pending?.involvedDiscordId) {
                return interaction.reply({ content: '❌ Selecione o **oficial acusado/envolvido**.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId('ia_details')
                .setTitle('Investigação — Detalhes do Incidente');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('radio_vehicle')
                        .setLabel('Viatura no dia (indicativo de rádio)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ex: Eagle-01, Patriot')
                        .setRequired(false)
                        .setMaxLength(50)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('incident_datetime')
                        .setLabel('Data e Hora do Fato (DD/MM/AAAA HH:MM)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ex: 04/06/2026 14:30')
                        .setRequired(false)
                        .setMaxLength(20)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('incident_location')
                        .setLabel('Local do Incidente')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ex: Cruzamento da Rua das Flores com Av. Brasil')
                        .setRequired(false)
                        .setMaxLength(200)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('classification')
                        .setLabel('Classificação / Motivo')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ex: Uso excessivo de força, Abuso de autoridade')
                        .setRequired(true)
                        .setMaxLength(200)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('complainant_id')
                        .setLabel('Identificação do Reclamante (opcional)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Nome, documento ou @Discord do reclamante')
                        .setRequired(false)
                        .setMaxLength(200)
                ),
            );

            return interaction.showModal(modal);
        }

        // ── Etapa 3: abre modal de descrição (sem campo de provas) ───
        if (action === 'step3') {
            const modal = new ModalBuilder()
                .setCustomId('ia_description')
                .setTitle('Investigação — Descrição do Ocorrido');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('description')
                        .setLabel('Descrição do Ocorrido')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Descreva detalhadamente o que ocorreu...')
                        .setRequired(true)
                        .setMaxLength(2000)
                ),
            );

            return interaction.showModal(modal);
        }

        // ── Criar investigação sem provas ────────────────────────────
        if (action === 'evidence_skip') {
            await interaction.deferUpdate();
            return createInvestigation(interaction, interaction.user.id, null);
        }

        // ── Cria canal temporário de provas e aguarda envio ──────────
        if (action === 'evidence_add') {
            await interaction.deferUpdate();

            const categoryId = await guildConfigRepo.get(interaction.guildId, 'ia_category_id');
            if (!categoryId) {
                return interaction.editReply({
                    content: '❌ Categoria de IA não configurada. Use `/configurar categoria-ia` ou crie a investigação sem provas.',
                    components: [],
                });
            }

            const pending    = pendingIA.get(interaction.guildId, interaction.user.id);
            const iaRoleIdsRaw = await guildConfigRepo.get(interaction.guildId, 'ia_role_ids');
            const iaRoleIds    = iaRoleIdsRaw ? JSON.parse(iaRoleIdsRaw) : [];

            // Gera número provisório de caso para o nome do canal
            const nextNum     = await iaRepo.nextCaseNumber(interaction.guildId);
            const channelName = `provas-${nextNum.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

            // Permissões: bot + cargo de IA + o oficial que abriu
            const permissionOverwrites = [
                { id: interaction.guild.id,          deny:  ['ViewChannel'] },
                { id: interaction.client.user.id,    allow: ['ViewChannel', 'SendMessages', 'ManageMessages', 'ManageChannels'] },
                { id: interaction.user.id,           allow: ['ViewChannel', 'SendMessages', 'AttachFiles'] },
                ...iaRoleIds.map(id => ({ id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles'] })),
            ];

            const provasChannel = await interaction.guild.channels.create({
                name: channelName,
                type: 0, // GuildText
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
                            .setCustomId(`ia:evidence_confirm:${interaction.user.id}`)
                            .setLabel('✅ Confirmar Provas')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`ia:evidence_cancel:${interaction.user.id}`)
                            .setLabel('Cancelar')
                            .setStyle(ButtonStyle.Secondary),
                    ),
                ],
            });

            // Guarda ID do canal temporário e da mensagem de coleta no pending
            pendingIA.setStep2(interaction.guildId, interaction.user.id, {
                collectionMsgId:   collectionMsg.id,
                provasChannelId:   provasChannel.id,
                reservedCaseNumber: nextNum,
            });

            return interaction.editReply({
                content:
                    `📎 Canal criado: <#${provasChannel.id}>\n` +
                    `Envie suas provas lá e clique em **✅ Confirmar Provas** quando terminar.`,
                components: [],
            });
        }

        // ── Confirma e cria investigação com as provas coletadas ─────
        // customId: ia:evidence_confirm:{openerId}
        if (action === 'evidence_confirm') {
            const openerId = parts[2];

            if (interaction.user.id !== openerId) {
                return interaction.reply({
                    content: '❌ Apenas o oficial que abriu a investigação pode confirmar as provas.',
                    ephemeral: true,
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const pending = pendingIA.get(interaction.guildId, openerId);
            if (!pending?.origin) {
                return interaction.editReply({ content: '❌ Sessão expirada. A investigação precisará ser reaberta.' });
            }

            // Coleta mensagens enviadas pelo oficial após a mensagem de coleta (no canal temporário)
            const collectionMsgId = pending.collectionMsgId;
            const userMessages    = collectionMsgId
                ? (await interaction.channel.messages.fetch({ after: collectionMsgId, limit: 50 }))
                      .filter(m => m.author.id === openerId && !m.author.bot)
                : new Map();

            // Separa textos (links) e attachments
            const textParts       = [];
            const attachmentFiles = [];
            for (const msg of userMessages.values()) {
                if (msg.content.trim()) textParts.push(msg.content.trim());
                for (const att of msg.attachments.values()) {
                    attachmentFiles.push({ url: att.url, name: att.name });
                }
            }

            // Re-envia os arquivos para o canal de IA antes de deletar o temporário,
            // garantindo que os URLs permaneçam acessíveis após a exclusão do canal
            const persistentUrls = [];
            const iaChannelId    = await guildConfigRepo.get(interaction.guildId, 'ia_channel_id');
            const iaChannel      = iaChannelId ? interaction.guild.channels.cache.get(iaChannelId) : null;

            if (iaChannel && attachmentFiles.length > 0) {
                const caseNum  = pending.reservedCaseNumber ?? '—';
                // Discord aceita URLs de attachment diretamente em files: e os rehospeda
                const chunks = [];
                for (let i = 0; i < attachmentFiles.length; i += 10) chunks.push(attachmentFiles.slice(i, i + 10));

                for (const chunk of chunks) {
                    const sent = await iaChannel.send({
                        content: chunks.indexOf(chunk) === 0 ? `📎 Provas — **${caseNum}**` : null,
                        files: chunk.map(f => f.url),
                    });
                    for (const att of sent.attachments.values()) persistentUrls.push(att.url);
                }
            }

            const evidenceParts = [...textParts, ...persistentUrls];
            const evidence = evidenceParts.length > 0 ? evidenceParts.join('\n') : null;

            await createInvestigation(interaction, openerId, evidence);

            // Deleta o canal temporário de provas (arquivos já foram rehospedados)
            const provasChannel = interaction.guild.channels.cache.get(pending.provasChannelId);
            if (provasChannel) await provasChannel.delete().catch(() => {});
        }

        // ── Cancela coleta de provas ──────────────────────────────────
        // customId: ia:evidence_cancel:{openerId}
        if (action === 'evidence_cancel') {
            const openerId = parts[2];

            if (interaction.user.id !== openerId) {
                return interaction.reply({
                    content: '❌ Apenas o oficial que abriu a investigação pode cancelar.',
                    ephemeral: true,
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const pending = pendingIA.get(interaction.guildId, openerId);
            pendingIA.clear(interaction.guildId, openerId);

            // Deleta o canal temporário de provas
            const provasChannel = interaction.guild.channels.cache.get(pending?.provasChannelId);
            if (provasChannel) await provasChannel.delete().catch(() => {});

            return interaction.editReply({
                content: '❌ Coleta de provas cancelada. A investigação **não** foi criada.\nUse `/ia abrir` ou o painel de IA para reiniciar.',
            });
        }
    },
};

// ── Helper: cria a investigação e publica o quadro ───────────────────────────
async function createInvestigation(interaction, openerId, evidence) {
    try {
        const pending = pendingIA.get(interaction.guildId, openerId);
        if (!pending?.origin) {
            const msg = { content: '❌ Sessão expirada. A investigação precisará ser reaberta.', components: [] };
            if (interaction.replied || interaction.deferred) return interaction.editReply(msg);
            return interaction.reply({ ...msg, ephemeral: true });
        }

        const profile    = await officialRepo.findByDiscordId(pending.involvedDiscordId, interaction.guildId);
        const caseNumber = pending.reservedCaseNumber ?? await iaRepo.nextCaseNumber(interaction.guildId);

        const inv = await iaRepo.create({
            guildId:           interaction.guildId,
            caseNumber,
            origin:            pending.origin,
            openedByDiscordId: openerId,
            involvedDiscordId: pending.involvedDiscordId,
            involvedCallsign:  profile?.callsign_num  || null,
            involvedBadge:     profile?.badge_num      || null,
            involvedDistrict:  profile?.district       || null,
            radioVehicle:      pending.radioVehicle,
            incidentDate:      pending.incidentDate,
            incidentTime:      pending.incidentTime,
            incidentLocation:  pending.incidentLocation,
            classification:    pending.classification,
            complainantId:     pending.complainantId,
            description:       pending.description,
            evidence,
        });

        pendingIA.clear(interaction.guildId, openerId);

        const board = await iaService.postBoard(interaction.guild, inv);
        const boardNote = board
            ? 'O quadro foi publicado no canal de Assuntos Internos.'
            : '⚠️ Investigação criada, mas o quadro não pôde ser publicado — verifique as permissões do canal de IA.';

        const msg = {
            content: `✅ **Investigação ${caseNumber} aberta com sucesso!**\n${boardNote}`,
            components: [],
        };
        if (interaction.replied || interaction.deferred) return interaction.editReply(msg);
        return interaction.reply({ ...msg, ephemeral: true });
    } catch (err) {
        logger.error('Erro ao criar investigação', { guild: interaction.guildId, error: err.message });
        const msg = { content: '❌ Erro ao criar a investigação. Tente novamente.', components: [] };
        if (interaction.replied || interaction.deferred) return interaction.editReply(msg);
        return interaction.reply({ ...msg, ephemeral: true });
    }
}
