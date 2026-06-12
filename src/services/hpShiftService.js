const hpShiftRepo    = require('../repositories/hpShiftRepository');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { buildHpShiftEmbed, buildHpShiftButtons, buildHpReportEmbed } = require('../utils/hpEmbeds');
const logger = require('../utils/logger');

async function startShift(interaction) {
    const { user, member, guild, guildId } = interaction;

    const existing = await hpShiftRepo.findActiveByUser(user.id, guildId);
    if (existing) {
        return { error: 'Você já possui um turno ativo. Encerre-o antes de iniciar um novo.' };
    }

    const shift = await hpShiftRepo.create(guildId, user.id, member.displayName);

    const channelId = await guildConfigRepo.get(guildId, 'hp_shift_channel_id');
    const channel   = channelId ? guild.channels.cache.get(channelId) : null;
    if (!channel) return { error: 'Canal de turnos do hospital não configurado. Use `/configurar hp-canal-turnos`.' };

    const embed    = buildHpShiftEmbed(shift, member);
    const buttons  = buildHpShiftButtons('active');
    const message  = await channel.send({ embeds: [embed], components: buttons });
    await hpShiftRepo.updateEmbedMessage(shift.id, message.id);
    shift.embed_message_id = message.id;

    return { shift };
}

async function pauseShift(interaction, targetDiscordId = null) {
    const discordId = targetDiscordId ?? interaction.user.id;
    const shift = await hpShiftRepo.findActiveByUser(discordId, interaction.guildId);
    if (!shift) return { error: 'Nenhum turno ativo encontrado.' };
    if (shift.status === 'paused') return { error: 'O turno já está em pausa.' };

    await hpShiftRepo.createPause(shift.id);
    await hpShiftRepo.updateStatus(shift.id, 'paused');
    shift.status = 'paused';

    await refreshEmbed(interaction.guild, { ...shift, status: 'paused' });
    return { shift };
}

async function resumeShift(interaction, targetDiscordId = null) {
    const discordId = targetDiscordId ?? interaction.user.id;
    const shift = await hpShiftRepo.findActiveByUser(discordId, interaction.guildId);
    if (!shift) return { error: 'Nenhum turno ativo encontrado.' };
    if (shift.status !== 'paused') return { error: 'O turno não está em pausa.' };

    await hpShiftRepo.endActivePause(shift.id);
    await hpShiftRepo.updateStatus(shift.id, 'active');
    shift.status = 'active';

    await refreshEmbed(interaction.guild, { ...shift, status: 'active' });
    return { shift };
}

async function endShift(interaction, targetDiscordId = null) {
    const discordId  = targetDiscordId ?? interaction.user.id;
    const actorId    = interaction.user.id;
    const { guild, guildId } = interaction;

    const shift = await hpShiftRepo.findActiveByUser(discordId, guildId);
    if (!shift) return { error: 'Nenhum turno ativo encontrado para esse usuário.' };

    if (shift.status === 'paused') {
        await hpShiftRepo.endActivePause(shift.id);
    }

    const totalPauseMs = await hpShiftRepo.sumPauses(shift.id);
    const endedBy      = actorId !== discordId ? actorId : null;
    const ended        = await hpShiftRepo.end(shift.id, totalPauseMs, endedBy);

    await refreshEmbed(guild, ended, true);

    const pauseCount   = await hpShiftRepo.countPauses(shift.id);
    const reportChId   = await guildConfigRepo.get(guildId, 'hp_report_channel_id');
    const reportCh     = reportChId ? guild.channels.cache.get(reportChId) : null;
    if (reportCh) {
        let member = null;
        try { member = await guild.members.fetch(discordId); } catch { /* não encontrado */ }
        const reportEmbed = buildHpReportEmbed(ended, member, pauseCount, endedBy);
        await reportCh.send({ embeds: [reportEmbed] });
    }

    return { shift: ended };
}

async function refreshEmbed(guild, shift, ended = false) {
    try {
        if (!shift.embed_message_id) return;
        const channelId = await guildConfigRepo.get(guild.id, 'hp_shift_channel_id');
        const channel   = channelId ? guild.channels.cache.get(channelId) : null;
        if (!channel) return;

        const message    = await channel.messages.fetch(shift.embed_message_id);
        let   member     = null;
        try { member = await guild.members.fetch(shift.discord_id); } catch { /* ok */ }

        const embed      = buildHpShiftEmbed(shift, member);
        const components = ended ? [] : buildHpShiftButtons(shift.status);
        await message.edit({ embeds: [embed], components });
    } catch (err) {
        logger.warn('Não foi possível atualizar embed de turno do hospital', { guild: guild.id, error: err.message });
    }
}

module.exports = { startShift, pauseShift, resumeShift, endShift, refreshEmbed };
