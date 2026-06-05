const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const iaMeasureRepo   = require('../repositories/iaMeasureRepository');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { COLOR }       = require('../utils/embeds');
const { formatTimestamp } = require('../utils/time');

const TYPE_LABEL = {
    punishment: '⚠️ Punição',
    suspension:  '🚫 Afastamento',
    other:       '📋 Outra Medida',
};

const STATUS_LABEL = {
    pending:     '🟡 Pendente',
    in_progress: '🔵 Em Andamento',
    completed:   '🟢 Finalizada',
};

function buildBoardEmbed(measure) {
    const fields = [
        { name: '👮 Oficial',       value: `<@${measure.target_discord_id}>`,    inline: true },
        { name: '⚖️ Tipo',          value: TYPE_LABEL[measure.type] ?? measure.type, inline: true },
        { name: '📊 Status',        value: STATUS_LABEL[measure.status] ?? measure.status, inline: true },
        { name: '🔰 Aplicado por',  value: `<@${measure.applied_by_discord_id}>`, inline: true },
        { name: '🕐 Data/Hora',     value: formatTimestamp(measure.created_at),   inline: true },
    ];

    if (measure.duration) {
        fields.push({ name: '⏱️ Duração / Prazo', value: measure.duration, inline: true });
    }

    if (measure.weapon_surrender) {
        fields.push({
            name: '🔫 Entrega de Armamento',
            value: `<@${measure.target_discord_id}>, por gentileza entregue seus armamentos a um oficial da AI assim que possível.`,
            inline: false,
        });
    }

    fields.push({ name: '📝 Descrição / Motivo', value: measure.description, inline: false });

    const color = measure.status === 'completed'
        ? COLOR.ACTIVE
        : measure.status === 'in_progress'
            ? COLOR.REPORT
            : COLOR.PAUSED;

    return new EmbedBuilder()
        .setColor(color)
        .setTitle(`⚖️ Medida Disciplinar — ${measure.measure_number}`)
        .addFields(fields)
        .setTimestamp();
}

function buildBoardButtons(measure) {
    if (measure.status === 'completed') return [];

    const row = new ActionRowBuilder();

    if (measure.status === 'pending') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`iameasure:in_progress:${measure.id}`)
                .setLabel('Marcar Em Andamento')
                .setEmoji('🔵')
                .setStyle(ButtonStyle.Primary),
        );
    }

    if (measure.status === 'in_progress') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`iameasure:completed:${measure.id}`)
                .setLabel('Finalizar Medida')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
        );
    }

    return [row];
}

async function postBoard(guild, measure) {
    const channelId = await guildConfigRepo.get(guild.id, 'ia_measures_channel_id');
    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId)
        ?? await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const embed      = buildBoardEmbed(measure);
    const components = buildBoardButtons(measure);

    const msg = await channel.send({ embeds: [embed], components });
    await iaMeasureRepo.updateBoard(measure.id, guild.id, msg.id, channel.id);
}

async function refreshBoard(guild, measure) {
    if (!measure.board_message_id || !measure.board_channel_id) return;

    const channel = guild.channels.cache.get(measure.board_channel_id)
        ?? await guild.channels.fetch(measure.board_channel_id).catch(() => null);
    if (!channel) return;

    try {
        const msg = await channel.messages.fetch(measure.board_message_id);
        const embed      = buildBoardEmbed(measure);
        const components = buildBoardButtons(measure);
        await msg.edit({ embeds: [embed], components });
    } catch {
        // mensagem deletada — ignora
    }
}

module.exports = { buildBoardEmbed, buildBoardButtons, postBoard, refreshBoard };
