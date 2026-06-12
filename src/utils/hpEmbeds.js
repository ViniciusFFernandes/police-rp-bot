const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { formatTimestamp, formatDuration } = require('./time');
const { COLOR } = require('./embeds');

function buildHpShiftEmbed(shift, member) {
    const statusLabel = {
        active: '🟢 Em Serviço',
        paused: '🟡 Em Pausa',
        ended:  '🔴 Encerrado',
    };
    const color = {
        active: COLOR.ACTIVE,
        paused: COLOR.PAUSED,
        ended:  COLOR.ENDED,
    };

    const embed = new EmbedBuilder()
        .setColor(color[shift.status] ?? COLOR.ACTIVE)
        .setTitle('🏥 Registro de Turno — Hospital')
        .setThumbnail(member?.displayAvatarURL?.() ?? member?.user?.displayAvatarURL?.() ?? null)
        .addFields(
            { name: '👤 Profissional', value: `<@${shift.discord_id}>`, inline: true },
            { name: '🕐 Início',       value: formatTimestamp(shift.started_at), inline: true },
            { name: '📊 Status',       value: statusLabel[shift.status] ?? shift.status, inline: true },
        )
        .setFooter({ text: `ID do Turno: ${shift.id}` })
        .setTimestamp();

    if (shift.status === 'ended' && shift.ended_at) {
        const effective = (new Date(shift.ended_at) - new Date(shift.started_at)) - (shift.total_pause_ms || 0);
        embed.addFields(
            { name: '🏁 Encerrado',      value: formatTimestamp(shift.ended_at), inline: true },
            { name: '⏱️ Tempo Total',    value: formatDuration(new Date(shift.ended_at) - new Date(shift.started_at)), inline: true },
            { name: '☕ Tempo em Pausa', value: formatDuration(shift.total_pause_ms || 0), inline: true },
            { name: '✅ Tempo Efetivo',  value: formatDuration(effective), inline: true },
        );
        if (shift.ended_by && shift.ended_by !== shift.discord_id) {
            embed.addFields({ name: '🔐 Encerrado por', value: `<@${shift.ended_by}>`, inline: true });
        }
    }

    return embed;
}

function buildHpShiftButtons(status) {
    const endBtn = new ButtonBuilder()
        .setCustomId('hp:end_from_embed')
        .setLabel('Encerrar Turno')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔴');

    const row = new ActionRowBuilder();

    if (status === 'active') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('hp:pause')
                .setLabel('Pausar')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⏸️'),
            endBtn,
        );
    } else if (status === 'paused') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('hp:resume')
                .setLabel('Retornar ao Serviço')
                .setStyle(ButtonStyle.Success)
                .setEmoji('▶️'),
            endBtn,
        );
    }

    return [row];
}

function buildHpReportEmbed(shift, member, pauseCount, closedBy = null) {
    const effective = (new Date(shift.ended_at) - new Date(shift.started_at)) - (shift.total_pause_ms || 0);

    const embed = new EmbedBuilder()
        .setColor(COLOR.REPORT)
        .setTitle('📋 Relatório de Turno Encerrado — Hospital')
        .addFields(
            { name: '👤 Profissional', value: `<@${shift.discord_id}> (${member?.user?.tag ?? member?.tag ?? shift.display_name ?? shift.discord_id})`, inline: false },
        );

    if (closedBy && closedBy !== shift.discord_id) {
        embed.addFields({ name: '🔐 Encerrado por', value: `<@${closedBy}>`, inline: false });
    }

    embed.addFields(
        { name: '🕐 Início',          value: formatTimestamp(shift.started_at), inline: true },
        { name: '🏁 Encerramento',    value: formatTimestamp(shift.ended_at), inline: true },
        { name: '⏱️ Tempo Total',     value: formatDuration(new Date(shift.ended_at) - new Date(shift.started_at)), inline: true },
        { name: '☕ Tempo em Pausa',  value: formatDuration(shift.total_pause_ms || 0), inline: true },
        { name: '✅ Tempo Efetivo',   value: formatDuration(effective), inline: true },
        { name: '⏸️ Pausas',          value: String(pauseCount), inline: true },
    )
        .setFooter({ text: `ID: ${shift.id}` })
        .setTimestamp();

    return embed;
}

function buildHpPanelEmbed() {
    return new EmbedBuilder()
        .setColor(COLOR.INFO)
        .setTitle('🏥 Painel do Hospital')
        .setDescription('Use os botões abaixo para registrar sua presença no serviço.')
        .addFields(
            { name: '▶️ Iniciar Turno',   value: 'Registra o início do seu turno.', inline: true },
            { name: '⏸️ Pausar / ▶️ Retornar', value: 'Pausa ou retoma o turno ativo.', inline: true },
            { name: '🔴 Encerrar Turno',  value: 'Finaliza o turno e gera o relatório.', inline: true },
        );
}

function buildHpPanelComponents() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('hp:start')
                .setLabel('Iniciar Turno')
                .setStyle(ButtonStyle.Success)
                .setEmoji('▶️'),
            new ButtonBuilder()
                .setCustomId('hp:pause_or_resume')
                .setLabel('Pausar / Retornar')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⏸️'),
            new ButtonBuilder()
                .setCustomId('hp:end')
                .setLabel('Encerrar Turno')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔴'),
        ),
    ];
}

function buildHpAdminPanelEmbed() {
    return new EmbedBuilder()
        .setColor(COLOR.LOSS)
        .setTitle('🏥 Painel Administrativo — Hospital')
        .setDescription('Ferramentas exclusivas para supervisores e administradores.\nTodas as respostas são visíveis apenas para você.')
        .addFields(
            { name: '🚑 Turnos em Andamento',  value: 'Lista todos os turnos ativos no momento, com opção de encerrar.', inline: true },
            { name: '📋 Histórico de Turnos',  value: 'Consulta o histórico de turnos encerrados de um membro.', inline: true },
            { name: '👤 Ver Perfil',            value: 'Exibe o resumo de horas e turnos de um membro.', inline: true },
        );
}

function buildHpAdminPanelComponents() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('hpadmin:active_shifts')
                .setLabel('Turnos em Andamento')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🚑'),
            new ButtonBuilder()
                .setCustomId('hpadmin:history_shifts')
                .setLabel('Histórico de Turnos')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋'),
            new ButtonBuilder()
                .setCustomId('hpadmin:member_profile')
                .setLabel('Ver Perfil')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('👤'),
        ),
    ];
}

module.exports = {
    buildHpShiftEmbed,
    buildHpShiftButtons,
    buildHpReportEmbed,
    buildHpPanelEmbed,
    buildHpPanelComponents,
    buildHpAdminPanelEmbed,
    buildHpAdminPanelComponents,
};
