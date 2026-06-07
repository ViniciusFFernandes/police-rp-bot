const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { formatTimestamp, formatDuration } = require('./time');

const COLOR = {
    ACTIVE: 0x2ECC71,
    PAUSED: 0xF39C12,
    ENDED: 0x95A5A6,
    REPORT: 0x3498DB,
    LOSS: 0xE74C3C,
    INFO: 0x2980B9,
};

const END_REASON_LABEL = {
    patrol_end:   'Fim de Patrulha',
    remodulation: 'Remodulação',
    other:        'Outro',
    force_closed: 'Encerrado pelo Supervisor',
};

// Texto amigável do motivo de encerramento, incluindo a nota livre quando houver
function endReasonLabel(reason, note) {
    if (!reason) return null;
    const base = END_REASON_LABEL[reason] || reason;
    if (reason === 'other' && note) return `${base} — ${note}`;
    return base;
}

// Lista de participantes da unidade formatada para embeds
function formatTeam(members) {
    if (!members || members.length === 0) return null;
    return members
        .map(m => `${m.role === 'LEADER' ? '⭐ **Responsável**' : '▫️ Oficial'}: <@${m.discord_id}>`)
        .join('\n');
}

function buildShiftEmbed(shift, user, voiceChannel) {
    const statusLabel = {
        active: '🟢 Em Serviço',
        paused: '🟡 Em Pausa',
        ended: '🔴 Encerrado',
    };

    const color = {
        active: COLOR.ACTIVE,
        paused: COLOR.PAUSED,
        ended: COLOR.ENDED,
    };

    const losses = shift.weapon_losses || [];
    const weaponList = shift.weapon_serials.map(serial => {
        const lost = losses.find(l => l.serial_number === serial);
        return lost ? `\`${serial}\` — ⚠️ EXTRAVIADA` : `\`${serial}\``;
    }).join('\n') || 'Nenhuma';

    const embed = new EmbedBuilder()
        .setColor(color[shift.status] || COLOR.ACTIVE)
        .setTitle('🚔 Registro de Turno')
        .setThumbnail(user.displayAvatarURL())
        .addFields(
            { name: '👮 Responsável', value: `<@${user.id}>`, inline: true },
            { name: '📟 Callsign', value: shift.callsign, inline: true },
            { name: '🚗 Viatura', value: shift.vehicle_name || shift.vehicle_prefix, inline: true },
        );

    const team = formatTeam(shift.members);
    if (team) {
        embed.addFields({ name: '👥 Equipe da Unidade', value: team, inline: false });
    }

    embed.addFields(
        { name: '🔫 Armamentos', value: weaponList, inline: false },
        { name: '🕐 Início', value: formatTimestamp(shift.started_at), inline: true },
        { name: '📊 Status', value: statusLabel[shift.status] || shift.status, inline: true },
    )
        .setFooter({ text: `ID do Turno: ${shift.id}` })
        .setTimestamp();

    if (voiceChannel) {
        embed.addFields({
            name: '🎙️ Canal de Voz',
            value: `<#${voiceChannel}>`,
            inline: true,
        });
    }

    if (shift.status === 'ended' && shift.ended_at) {
        const effective = (new Date(shift.ended_at) - new Date(shift.started_at)) - (shift.total_pause_ms || 0);
        embed.addFields(
            { name: '🏁 Encerrado', value: formatTimestamp(shift.ended_at), inline: true },
            { name: '⏱️ Tempo Total', value: formatDuration(new Date(shift.ended_at) - new Date(shift.started_at)), inline: true },
            { name: '☕ Tempo em Pausa', value: formatDuration(shift.total_pause_ms || 0), inline: true },
            { name: '✅ Tempo Efetivo', value: formatDuration(effective), inline: true },
        );
    }

    return embed;
}

function buildShiftButtons(status) {
    const addWeaponBtn = new ButtonBuilder()
        .setCustomId('shift:add_weapon')
        .setLabel('Adicionar Arma')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔫');

    const weaponLossBtn = new ButtonBuilder()
        .setCustomId('shift:weapon_loss')
        .setLabel('Arma Perdida')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⚠️');

    const endBtn = new ButtonBuilder()
        .setCustomId('shift:end')
        .setLabel('Encerrar Turno')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔴');

    // Linha 1 — ações de estado
    const row1 = new ActionRowBuilder();
    if (status === 'active') {
        row1.addComponents(
            new ButtonBuilder()
                .setCustomId('shift:pause')
                .setLabel('Pausar')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⏸️'),
            weaponLossBtn,
            endBtn,
        );
    } else if (status === 'paused') {
        row1.addComponents(
            new ButtonBuilder()
                .setCustomId('shift:resume')
                .setLabel('Retornar ao Serviço')
                .setStyle(ButtonStyle.Success)
                .setEmoji('▶️'),
            weaponLossBtn,
            endBtn,
        );
    }

    // Linha 2 — gestão de armamento
    const row2 = new ActionRowBuilder().addComponents(addWeaponBtn);

    return [row1, row2];
}

function buildReportEmbed(shift, user, pauses, closedBy = null) {
    const losses = shift.weapon_losses || [];
    const effective = (new Date(shift.ended_at) - new Date(shift.started_at)) - (shift.total_pause_ms || 0);

    const embed = new EmbedBuilder()
        .setColor(COLOR.REPORT)
        .setTitle('📋 Relatório de Turno Encerrado')
        .addFields(
            { name: '👮 Responsável', value: `<@${user.id}> (${user.tag})`, inline: false },
        );

    if (closedBy && closedBy.id !== user.id) {
        embed.addFields({ name: '🔐 Encerrado por', value: `<@${closedBy.id}> (${closedBy.tag})`, inline: false });
    }

    const team = formatTeam(shift.members);
    if (team) {
        embed.addFields({ name: '👥 Equipe da Unidade', value: team, inline: false });
    }

    embed.addFields(
        { name: '📟 Callsign', value: shift.callsign, inline: true },
        { name: '🚗 Viatura', value: shift.vehicle_name || shift.vehicle_prefix, inline: true },
        { name: '🕐 Início', value: formatTimestamp(shift.started_at), inline: true },
        { name: '🏁 Encerramento', value: formatTimestamp(shift.ended_at), inline: true },
        { name: '⏱️ Tempo Total', value: formatDuration(new Date(shift.ended_at) - new Date(shift.started_at)), inline: true },
        { name: '☕ Tempo em Pausa', value: formatDuration(shift.total_pause_ms || 0), inline: true },
        { name: '✅ Tempo Efetivo', value: formatDuration(effective), inline: true },
        { name: '⏸️ Pausas', value: String(pauses.length), inline: true },
    );

    const reason = endReasonLabel(shift.end_reason, shift.end_reason_note);
    if (reason) {
        embed.addFields({ name: '📕 Motivo do Encerramento', value: reason, inline: true });
    }

    embed.addFields(
        { name: '🔫 Armas', value: shift.weapon_serials.join(', ') || 'Nenhuma', inline: false },
        { name: '⚠️ Extravios', value: losses.length > 0 ? losses.map(l => `\`${l.serial_number}\``).join(', ') : 'Nenhum', inline: false },
    )
        .setFooter({ text: `ID: ${shift.id}` })
        .setTimestamp();

    return embed;
}

function buildWeaponLossEmbed(shift, user, loss, reportedByUser = null) {
    const embed = new EmbedBuilder()
        .setColor(COLOR.LOSS)
        .setTitle('🚨 Extravio de Armamento')
        .addFields(
            { name: '👮 Oficial', value: `<@${user.id}> (${user.tag})`, inline: false },
            { name: '📟 Callsign', value: shift.callsign, inline: true },
            { name: '🚗 Viatura', value: shift.vehicle_name || shift.vehicle_prefix, inline: true },
            { name: '🔫 Nº de Série', value: `\`${loss.serial_number}\``, inline: true },
            { name: '🕐 Horário', value: formatTimestamp(loss.reported_at), inline: true },
            { name: '📝 Observação', value: loss.observation || 'Sem observação', inline: false },
        );

    if (reportedByUser && reportedByUser.id !== user.id) {
        embed.addFields({ name: '✍️ Registrado por', value: `<@${reportedByUser.id}>`, inline: true });
    }

    return embed
        .setFooter({ text: `Turno: ${shift.id}` })
        .setTimestamp();
}

function buildWeaponAddedEmbed(shift, user, weaponName, serialNumber) {
    return new EmbedBuilder()
        .setColor(COLOR.INFO)
        .setTitle('🔫 Armamento Adicionado ao Turno')
        .addFields(
            { name: '👮 Oficial', value: `<@${user.id}> (${user.tag})`, inline: false },
            { name: '📟 Callsign', value: shift.callsign, inline: true },
            { name: '🚗 Viatura', value: shift.vehicle_name || shift.vehicle_prefix, inline: true },
            { name: '📛 Nome', value: weaponName, inline: true },
            { name: '🔢 Nº de Série', value: `\`${serialNumber}\``, inline: true },
            { name: '🕐 Horário', value: formatTimestamp(new Date()), inline: true },
        )
        .setFooter({ text: `Turno: ${shift.id}` })
        .setTimestamp();
}

module.exports = {
    buildShiftEmbed,
    buildShiftButtons,
    buildReportEmbed,
    buildWeaponLossEmbed,
    buildWeaponAddedEmbed,
    endReasonLabel,
    formatTeam,
    COLOR,
};
