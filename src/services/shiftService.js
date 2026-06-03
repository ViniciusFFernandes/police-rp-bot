const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../database/pool');
const shiftRepo = require('../repositories/shiftRepository');
const pauseRepo = require('../repositories/pauseRepository');
const weaponRepo = require('../repositories/weaponRepository');
const weaponLossRepo = require('../repositories/weaponLossRepository');
const officialWeaponRepo = require('../repositories/officialWeaponRepository');
const userRepo = require('../repositories/userRepository');
const { buildShiftEmbed, buildShiftButtons, buildReportEmbed, buildWeaponLossEmbed, buildWeaponAddedEmbed } = require('../utils/embeds');
const logger = require('../utils/logger');

async function startShift(interaction, cfg, { callsign, vehiclePrefix }) {
    const member = interaction.member;
    const guild = interaction.guild;

    const dbUser = await userRepo.upsert(member.id, member.user.username, member.displayName);

    const existing = await shiftRepo.findActiveByUser(dbUser.id, guild.id);
    if (existing) {
        return { error: 'Você já possui um turno ativo. Encerre-o antes de iniciar um novo.' };
    }

    // Carrega arsenal cadastrado do oficial, excluindo armas extraviadas
    const officialWeapons = await officialWeaponRepo.findByUser(dbUser.id, guild.id, { excludeLost: true });
    const weaponSerials = officialWeapons.map(w => w.serial_number);

    let shift, voiceChannel;

    await db.transaction(async (client) => {
        shift = await shiftRepo.create(client, {
            userId: dbUser.id,
            guildId: guild.id,
            callsign,
            vehiclePrefix,
            weaponSerials,
        });
    });

    for (const serial of weaponSerials) {
        await weaponRepo.upsert(serial, guild.id);
        await weaponRepo.setInUse(serial, guild.id, dbUser.id, shift.id);
    }

    try {
        voiceChannel = await guild.channels.create({
            name: callsign,
            type: ChannelType.GuildVoice,
            parent: cfg.voice_category_id,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel],
                },
            ],
        });
        await shiftRepo.updateVoiceChannel(shift.id, voiceChannel.id);
        shift.voice_channel_id = voiceChannel.id;
    } catch (err) {
        logger.warn('Não foi possível criar canal de voz', { guild: guild.id, error: err.message });
    }

    shift.weapon_losses = [];
    const embed = buildShiftEmbed(shift, member.user, shift.voice_channel_id);
    const buttons = buildShiftButtons('active');

    const shiftChannel = guild.channels.cache.get(cfg.shift_channel_id);
    if (!shiftChannel) return { error: 'Canal de turnos não encontrado. Use `/configurar canal-turnos`.' };

    const message = await shiftChannel.send({ embeds: [embed], components: buttons });
    await shiftRepo.updateEmbedMessage(shift.id, message.id);

    return { shift, message };
}

async function pauseShift(interaction, targetDiscordId = null) {
    const discordId = targetDiscordId || interaction.user.id;
    const dbUser = await userRepo.findByDiscordId(discordId);
    if (!dbUser) return { error: 'Usuário não encontrado.' };

    const shift = await shiftRepo.findActiveByUser(dbUser.id, interaction.guildId);
    if (!shift) return { error: 'Nenhum turno ativo encontrado.' };
    if (shift.status === 'paused') return { error: 'O turno já está em pausa.' };

    await pauseRepo.create(shift.id);
    await shiftRepo.updateStatus(shift.id, 'paused');
    shift.status = 'paused';

    const shiftUser = await resolveUserForEmbed(interaction, discordId);
    await refreshEmbed(interaction.guild, shift, shiftUser);
    return { shift };
}

async function resumeShift(interaction, targetDiscordId = null) {
    const discordId = targetDiscordId || interaction.user.id;
    const dbUser = await userRepo.findByDiscordId(discordId);
    if (!dbUser) return { error: 'Usuário não encontrado.' };

    const shift = await shiftRepo.findActiveByUser(dbUser.id, interaction.guildId);
    if (!shift) return { error: 'Nenhum turno ativo encontrado.' };
    if (shift.status !== 'paused') return { error: 'O turno não está em pausa.' };

    await pauseRepo.endActive(shift.id);
    await shiftRepo.updateStatus(shift.id, 'active');
    shift.status = 'active';

    const shiftUser = await resolveUserForEmbed(interaction, discordId);
    await refreshEmbed(interaction.guild, shift, shiftUser);
    return { shift };
}

async function reportWeaponLoss(interaction, { serialNumber, observation }) {
    const dbUser = await userRepo.findByDiscordId(interaction.user.id);
    if (!dbUser) return { error: 'Usuário não encontrado.' };

    const shift = await shiftRepo.findActiveByUser(dbUser.id, interaction.guildId);
    if (!shift) return { error: 'Nenhum turno ativo encontrado.' };

    if (!shift.weapon_serials.includes(serialNumber)) {
        return { error: `A arma \`${serialNumber}\` não foi registrada no início deste turno.` };
    }

    const alreadyLost = await weaponLossRepo.existsInShift(shift.id, serialNumber);
    if (alreadyLost) {
        return { error: `A arma \`${serialNumber}\` já foi registrada como extraviada neste turno.` };
    }

    const loss = await weaponLossRepo.create({
        shiftId: shift.id,
        userId: dbUser.id,
        serialNumber,
        observation,
    });

    await weaponRepo.setLost(serialNumber, interaction.guildId);

    const updatedShift = await shiftRepo.findById(shift.id);
    await refreshEmbed(interaction.guild, updatedShift, interaction.user);

    const guildConfigRepo = require('../repositories/guildConfigRepository');
    const weaponChannelId = await guildConfigRepo.get(interaction.guildId, 'weapon_report_channel_id');
    const reportChannel = interaction.guild.channels.cache.get(weaponChannelId);
    if (reportChannel) {
        const lossEmbed = buildWeaponLossEmbed(updatedShift, interaction.user, loss);
        await reportChannel.send({ embeds: [lossEmbed] });
    }

    return { loss };
}

async function endShift(interaction, targetDiscordId = null) {
    const discordId = targetDiscordId || interaction.user.id;
    const dbUser = await userRepo.findByDiscordId(discordId);
    if (!dbUser) return { error: 'Usuário não encontrado.' };

    const shift = await shiftRepo.findActiveByUser(dbUser.id, interaction.guildId);
    if (!shift) return { error: 'Nenhum turno ativo encontrado.' };

    if (shift.status === 'paused') {
        await pauseRepo.endActive(shift.id);
    }

    const totalPauseMs = await pauseRepo.sumByShift(shift.id);
    const ended = await shiftRepo.end(shift.id, totalPauseMs);
    ended.weapon_losses = shift.weapon_losses;

    for (const serial of shift.weapon_serials) {
        const isLost = shift.weapon_losses.some(l => l.serial_number === serial);
        if (!isLost) await weaponRepo.setAvailable(serial, interaction.guildId);
    }

    if (shift.voice_channel_id) {
        try {
            const vc = interaction.guild.channels.cache.get(shift.voice_channel_id);
            if (vc) await vc.delete('Turno encerrado');
        } catch (err) {
            logger.warn('Não foi possível excluir canal de voz', { error: err.message });
        }
    }

    const shiftUser = await resolveUserForEmbed(interaction, discordId);
    await refreshEmbed(interaction.guild, ended, shiftUser, true);

    const pauses = await pauseRepo.findByShift(shift.id);
    const guildConfigRepo = require('../repositories/guildConfigRepository');
    const reportChannelId = await guildConfigRepo.get(interaction.guildId, 'report_channel_id');
    const reportChannel = interaction.guild.channels.cache.get(reportChannelId);
    if (reportChannel) {
        const reportEmbed = buildReportEmbed(ended, shiftUser, pauses);
        await reportChannel.send({ embeds: [reportEmbed] });
    }

    return { shift: ended };
}

// Busca o objeto User do Discord para usar nos embeds.
// Se o supervisor está agindo pelo dono, busca o membro pelo discord_id do dono.
async function resolveUserForEmbed(interaction, discordId) {
    if (discordId === interaction.user.id) return interaction.user;
    try {
        const member = await interaction.guild.members.fetch(discordId);
        return member.user;
    } catch {
        return interaction.user;
    }
}

async function refreshEmbed(guild, shift, user, ended = false) {
    try {
        const guildConfigRepo = require('../repositories/guildConfigRepository');
        const shiftChannelId = await guildConfigRepo.get(guild.id, 'shift_channel_id');
        if (!shiftChannelId || !shift.embed_message_id) return;

        const shiftChannel = guild.channels.cache.get(shiftChannelId);
        if (!shiftChannel) return;

        const message = await shiftChannel.messages.fetch(shift.embed_message_id);
        const embed = buildShiftEmbed(shift, user, shift.voice_channel_id);
        const components = ended ? [] : buildShiftButtons(shift.status);
        await message.edit({ embeds: [embed], components });
    } catch (err) {
        logger.warn('Não foi possível atualizar embed do turno', { guild: guild.id, error: err.message });
    }
}

async function addWeaponToShift(interaction, { weaponName, serialNumber }) {
    const dbUser = await userRepo.findByDiscordId(interaction.user.id);
    if (!dbUser) return { error: 'Usuário não encontrado.' };

    const shift = await shiftRepo.findActiveByUser(dbUser.id, interaction.guildId);
    if (!shift) return { error: 'Nenhum turno ativo encontrado.' };

    if (shift.weapon_serials.includes(serialNumber)) {
        return { error: `A arma \`${serialNumber}\` já está registrada neste turno.` };
    }

    // Adiciona ao arsenal pessoal se ainda não cadastrada
    await officialWeaponRepo.register(dbUser.id, interaction.guildId, weaponName, serialNumber);
    await weaponRepo.upsert(serialNumber, interaction.guildId);
    await weaponRepo.setInUse(serialNumber, interaction.guildId, dbUser.id, shift.id);

    // Atualiza o array de seriais no turno
    await shiftRepo.addWeaponSerial(shift.id, serialNumber);

    const updatedShift = await shiftRepo.findById(shift.id);
    await refreshEmbed(interaction.guild, updatedShift, interaction.user);

    const guildConfigRepo = require('../repositories/guildConfigRepository');
    const weaponChannelId = await guildConfigRepo.get(interaction.guildId, 'weapon_report_channel_id');
    const reportChannel = interaction.guild.channels.cache.get(weaponChannelId);
    if (reportChannel) {
        const embed = buildWeaponAddedEmbed(updatedShift, interaction.user, weaponName, serialNumber);
        await reportChannel.send({ embeds: [embed] });
    }

    return { serialNumber };
}

module.exports = { startShift, pauseShift, resumeShift, reportWeaponLoss, endShift, addWeaponToShift };
