const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const srRepo          = require('../repositories/serviceReportRepository');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { COLOR }       = require('../utils/embeds');
const { formatTimestamp, formatDateOnly } = require('../utils/time');

const TYPE_LABEL = {
    ocorrencia:          '🟦 Relatório de Ocorrência',
    prisao:              '🟩 Relatório de Prisão/Captura',
    crime_nao_resolvido: '🟥 Crime Não Resolvido',
};

const STATUS_LABEL = {
    em_analise: '🟡 Em Análise',
    finalizado: '🔵 Finalizado',
    resolvido:  '🟢 Resolvido',
    arquivado:  '⚫ Arquivado',
};

function statusColor(status) {
    if (status === 'finalizado') return COLOR.INFO;
    if (status === 'resolvido')  return COLOR.WIN;
    if (status === 'arquivado')  return COLOR.ENDED;
    return COLOR.PAUSED; // em_analise
}

function buildBoardEmbed(report) {
    let involvedIds = [];
    try { involvedIds = JSON.parse(report.involved_discord_ids); } catch { involvedIds = []; }

    const embed = new EmbedBuilder()
        .setColor(statusColor(report.status))
        .setTitle(`📋 Relatório de Serviço — ${report.report_number}`)
        .addFields(
            { name: '📂 Tipo',      value: TYPE_LABEL[report.type]     || report.type,   inline: true },
            { name: '📊 Status',    value: STATUS_LABEL[report.status] || report.status, inline: true },
            { name: '📅 Abertura',  value: formatTimestamp(report.opened_at),             inline: true },
            { name: '👮 Responsável', value: `<@${report.opened_by_discord_id}>`,         inline: true },
        );

    // Oficiais envolvidos (sem o responsável para não duplicar)
    const otherOfficers = involvedIds.filter(id => id !== report.opened_by_discord_id);
    if (otherOfficers.length > 0) {
        embed.addFields({
            name:   '👥 Outros Oficiais Envolvidos',
            value:  otherOfficers.map(id => `<@${id}>`).join('\n'),
            inline: false,
        });
    }

    // Detalhes do incidente
    const incidentFields = [];
    if (report.incident_date || report.incident_time) {
        const dt = [
            report.incident_date ? formatDateOnly(report.incident_date) : null,
            report.incident_time,
        ].filter(Boolean).join(' ');
        incidentFields.push({ name: '🗓️ Data/Hora', value: dt, inline: true });
    }
    if (report.incident_location) {
        incidentFields.push({ name: '📍 Local', value: report.incident_location, inline: true });
    }
    if (incidentFields.length) embed.addFields(incidentFields);

    if (report.description) {
        embed.addFields({ name: '📝 Descrição do Ocorrido', value: report.description.slice(0, 1024), inline: false });
    }
    if (report.suspects) {
        embed.addFields({ name: '🕵️ Suspeitos/Envolvidos Civis', value: report.suspects.slice(0, 1024), inline: false });
    }
    if (report.seized_items) {
        embed.addFields({ name: '📦 Itens Apreendidos', value: report.seized_items.slice(0, 1024), inline: false });
    }
    if (report.evidence) {
        embed.addFields({ name: '🔗 Provas/Evidências', value: report.evidence.slice(0, 1024), inline: false });
    }

    embed.setFooter({ text: `Nº do Relatório: ${report.report_number}` }).setTimestamp();
    return embed;
}

function buildBoardButtons(report) {
    const rows = [];

    // Botões de status (apenas quando em análise)
    if (report.status === 'em_analise') {
        const statusRow = new ActionRowBuilder();

        if (report.type === 'crime_nao_resolvido') {
            statusRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`sr_board:resolve:${report.id}`)
                    .setLabel('Marcar como Resolvido')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`sr_board:archive:${report.id}`)
                    .setLabel('Arquivar')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📁'),
            );
        } else {
            statusRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`sr_board:finalize:${report.id}`)
                    .setLabel('Finalizar Relatório')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✅'),
            );
        }

        rows.push(statusRow);
    }

    // Botões de gerenciamento (sempre visíveis enquanto não arquivado/finalizado/resolvido)
    if (report.status === 'em_analise') {
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`sr_board:add_officers:${report.id}`)
                .setLabel('Adicionar Oficial')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('➕'),
            new ButtonBuilder()
                .setCustomId(`sr_board:edit_description:${report.id}`)
                .setLabel('Editar Descrição')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('✏️'),
            new ButtonBuilder()
                .setCustomId(`sr_board:add_evidence:${report.id}`)
                .setLabel('Adicionar Provas')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📎'),
        ));
    }

    return rows;
}

async function postBoard(guild, report) {
    const channelId = await guildConfigRepo.get(guild.id, 'sr_channel_id');
    if (!channelId) return null;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return null;

    try {
        const embed      = buildBoardEmbed(report);
        const components = buildBoardButtons(report);
        const msg        = await channel.send({ embeds: [embed], components });
        await srRepo.updateBoard(report.id, msg.id, channel.id);
        return msg;
    } catch {
        return null;
    }
}

async function refreshBoard(guild, report) {
    if (!report.board_message_id || !report.board_channel_id) {
        await postBoard(guild, report);
        return;
    }

    const channel = await guild.channels.fetch(report.board_channel_id).catch(() => null);
    if (!channel) return;

    const msg = await channel.messages.fetch(report.board_message_id).catch(() => null);
    if (!msg) {
        await postBoard(guild, report);
        return;
    }

    try {
        const embed      = buildBoardEmbed(report);
        const components = buildBoardButtons(report);
        await msg.edit({ embeds: [embed], components });
    } catch {
        // sem permissão — silencioso
    }
}

module.exports = { buildBoardEmbed, buildBoardButtons, postBoard, refreshBoard, TYPE_LABEL, STATUS_LABEL };
