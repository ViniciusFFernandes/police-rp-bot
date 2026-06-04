const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const iaRepo = require('../repositories/iaRepository');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { COLOR } = require('../utils/embeds');
const { formatTimestamp, formatDateOnly } = require('../utils/time');

const ORIGIN_LABEL = {
    civil:    '🟦 Civil (Pública)',
    internal: '🟥 Interna (Blue-on-Blue)',
    ois:      '⬛ Uso de Força Crítico (OIS)',
};

const STATUS_LABEL = {
    active:    '🟢 Investigação Ativa',
    suspended: '🟡 Investigação Suspensa',
    closed:    '🔴 Investigação Encerrada',
};

const VERDICT_LABEL = {
    sustained:     '✅ Sustentado (Sustained)',
    not_sustained: '⚠️ Não Sustentado (Not Sustained)',
    exonerated:    '🔵 Exonerado (Exonerated)',
    unfounded:     '❌ Infundado (Unfounded)',
};

const PENALTY_STATUS_LABEL = {
    applied:          '✅ Penalidade Aplicada',
    not_applied:      '❌ Penalidade Não Aplicada',
    applied_modified: '🔶 Aplicada com Modificações',
};

function buildBoardEmbed(inv) {
    const embed = new EmbedBuilder()
        .setColor(inv.status === 'closed' ? COLOR.ENDED : inv.status === 'suspended' ? COLOR.PAUSED : 0xE74C3C)
        .setTitle(`🔍 Investigação Interna — ${inv.case_number}`)
        .addFields(
            { name: '📂 Origem', value: ORIGIN_LABEL[inv.origin] || inv.origin, inline: true },
            { name: '📊 Status', value: STATUS_LABEL[inv.status] || inv.status, inline: true },
            { name: '📅 Abertura', value: formatTimestamp(inv.opened_at), inline: true },
            { name: '👮 Responsável', value: `<@${inv.opened_by_discord_id}>`, inline: true },
        );

    // Acusado
    const callsignInfo = inv.involved_callsign ? `\`${inv.involved_callsign}\`` : '—';
    const badgeInfo    = inv.involved_badge    ? `\`${inv.involved_badge}\``    : '—';
    const distInfo     = inv.involved_district ? `Distrito ${inv.involved_district}` : '—';
    embed.addFields(
        { name: '🚨 Acusado/Envolvido', value: `<@${inv.involved_discord_id}>`, inline: true },
        { name: '📟 Callsign', value: callsignInfo, inline: true },
        { name: '🪪 Distintivo', value: badgeInfo, inline: true },
        { name: '🗺️ Distrito', value: distInfo, inline: true },
    );

    if (inv.radio_vehicle) {
        embed.addFields({ name: '📻 Identificação (Dia)', value: `\`${inv.radio_vehicle}\``, inline: true });
    }

    // Detalhes do incidente
    const incidentFields = [];
    if (inv.incident_date || inv.incident_time) {
        const dt = [inv.incident_date ? formatDateOnly(inv.incident_date) : null, inv.incident_time]
            .filter(Boolean).join(' ');
        incidentFields.push({ name: '🗓️ Data/Hora do Fato', value: dt, inline: true });
    }
    if (inv.incident_location) {
        incidentFields.push({ name: '📍 Local', value: inv.incident_location, inline: true });
    }
    if (inv.classification) {
        incidentFields.push({ name: '🏷️ Classificação', value: inv.classification, inline: true });
    }
    if (inv.complainant_id) {
        incidentFields.push({ name: '👤 Identificação do Reclamante', value: inv.complainant_id, inline: true });
    }
    if (incidentFields.length) embed.addFields(incidentFields);

    if (inv.description) {
        embed.addFields({ name: '📝 Descrição do Ocorrido', value: inv.description.slice(0, 1024), inline: false });
    }

    if (inv.evidence) {
        embed.addFields({ name: '🔗 Provas/Evidências', value: inv.evidence.slice(0, 1024), inline: false });
    }

    // Encerramento
    if (inv.status === 'closed') {
        embed.addFields(
            { name: '⚖️ Veredicto', value: VERDICT_LABEL[inv.closure_verdict] || inv.closure_verdict || '—', inline: true },
        );
        if (inv.penalty_recommendation) {
            embed.addFields({ name: '📋 Recomendação de Penalidade', value: inv.penalty_recommendation, inline: false });
        }
        if (inv.penalty_status) {
            embed.addFields({ name: '🔖 Status da Penalidade', value: PENALTY_STATUS_LABEL[inv.penalty_status] || inv.penalty_status, inline: true });
        }
    }

    embed.setFooter({ text: `Nº do Caso: ${inv.case_number}` }).setTimestamp();
    return embed;
}

function buildBoardButtons(inv) {
    const rows = [];

    if (inv.status !== 'closed') {
        const activeBtn = new ButtonBuilder()
            .setCustomId(`ia_board:status_active:${inv.id}`)
            .setLabel('Ativar')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🟢')
            .setDisabled(inv.status === 'active');

        const suspendBtn = new ButtonBuilder()
            .setCustomId(`ia_board:status_suspended:${inv.id}`)
            .setLabel('Suspender')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🟡')
            .setDisabled(inv.status === 'suspended');

        const closeBtn = new ButtonBuilder()
            .setCustomId(`ia_board:close:${inv.id}`)
            .setLabel('Encerrar Investigação')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔴');

        rows.push(new ActionRowBuilder().addComponents(activeBtn, suspendBtn, closeBtn));
    } else if (!inv.penalty_status) {
        // Botões de penalidade após encerramento
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ia_board:penalty:${inv.id}:applied`)
                .setLabel('Penalidade Aplicada')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`ia_board:penalty:${inv.id}:not_applied`)
                .setLabel('Não Aplicada')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌'),
            new ButtonBuilder()
                .setCustomId(`ia_board:penalty:${inv.id}:applied_modified`)
                .setLabel('Aplicada c/ Modificações')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔶'),
        ));
    }

    return rows;
}

async function postBoard(guild, inv) {
    const channelId = await guildConfigRepo.get(guild.id, 'ia_channel_id');
    if (!channelId) return null;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return null;

    const embed = buildBoardEmbed(inv);
    const components = buildBoardButtons(inv);

    const msg = await channel.send({ embeds: [embed], components });
    await iaRepo.updateBoard(inv.id, msg.id, channel.id);
    return msg;
}

async function refreshBoard(guild, inv) {
    if (!inv.board_message_id || !inv.board_channel_id) {
        await postBoard(guild, inv);
        return;
    }
    const channel = await guild.channels.fetch(inv.board_channel_id).catch(() => null);
    if (!channel) return;

    const msg = await channel.messages.fetch(inv.board_message_id).catch(() => null);
    if (!msg) {
        await postBoard(guild, inv);
        return;
    }

    const embed = buildBoardEmbed(inv);
    const components = buildBoardButtons(inv);
    await msg.edit({ embeds: [embed], components });
}

module.exports = { buildBoardEmbed, buildBoardButtons, postBoard, refreshBoard, ORIGIN_LABEL, VERDICT_LABEL };
