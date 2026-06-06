const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const guildConfigRepo  = require('../repositories/guildConfigRepository');
const complaintRepo    = require('../repositories/civilComplaintRepository');
const { COLOR } = require('../utils/embeds');
const logger = require('../utils/logger');

const STATUS_LABEL = {
    pending:  '🟡 Aguardando avaliação',
    accepted: '✅ Aceita',
    rejected: '❌ Arquivada',
};

function buildReviewEmbed(complaint) {
    const embed = new EmbedBuilder()
        .setColor(complaint.status === 'rejected' ? COLOR.LOSS : (complaint.status === 'accepted' ? COLOR.ACTIVE : COLOR.INFO))
        .setTitle(`📢 Denúncia Civil — ${complaint.complaint_number}`)
        .addFields(
            { name: 'Status',      value: STATUS_LABEL[complaint.status] || complaint.status, inline: true },
            { name: 'Denunciante', value: `<@${complaint.complainant_discord_id}> (${complaint.complainant_name || '🕵️ Anônimo'})`, inline: true },
            { name: 'CitizenID',   value: complaint.citizen_id || '🕵️ Anônimo', inline: true },
            { name: 'Telefone',    value: complaint.phone || '—', inline: true },
            { name: 'Assunto',     value: complaint.subject || '—' },
            { name: 'Descrição',   value: (complaint.description || '—').slice(0, 1024) },
        );

    if (complaint.evidence) {
        embed.addFields({ name: 'Provas', value: complaint.evidence.slice(0, 1024) });
    }

    if (complaint.status !== 'pending') {
        embed.addFields(
            { name: 'Avaliada por', value: complaint.reviewed_by_discord_id ? `<@${complaint.reviewed_by_discord_id}>` : '—', inline: true },
        );
        if (complaint.review_note) {
            embed.addFields({ name: 'Observação da Corregedoria', value: complaint.review_note.slice(0, 1024) });
        }
    }

    return embed;
}

function buildReviewComponents(complaint) {
    if (complaint.status !== 'pending') return [];

    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`civilcomplaint:accept:${complaint.id}`)
                .setLabel('Aceitar — Abrir Investigação')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`civilcomplaint:reject:${complaint.id}`)
                .setLabel('Arquivar')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger),
        ),
    ];
}

async function postReviewCard(guild, complaint) {
    try {
        const channelId = await guildConfigRepo.get(guild.id, 'civil_complaints_channel_id');
        if (!channelId) {
            logger.warn('Canal de avaliação de denúncias civis não configurado', { guild: guild.id });
            return;
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        const msg = await channel.send({
            embeds: [buildReviewEmbed(complaint)],
            components: buildReviewComponents(complaint),
        });

        await complaintRepo.updateBoard(complaint.id, msg.id, channel.id);
    } catch (err) {
        logger.warn('Não foi possível publicar a denúncia para avaliação', {
            guild: guild.id,
            error: err.message,
        });
    }
}

async function refreshReviewCard(guild, complaint) {
    try {
        if (!complaint.board_message_id || !complaint.board_channel_id) return;
        const channel = guild.channels.cache.get(complaint.board_channel_id);
        if (!channel) return;

        const msg = await channel.messages.fetch(complaint.board_message_id);
        await msg.edit({
            embeds: [buildReviewEmbed(complaint)],
            components: buildReviewComponents(complaint),
        });
    } catch (err) {
        logger.warn('Não foi possível atualizar o card de avaliação da denúncia', {
            guild: guild.id,
            error: err.message,
        });
    }
}

module.exports = { postReviewCard, refreshReviewCard, buildReviewEmbed };
