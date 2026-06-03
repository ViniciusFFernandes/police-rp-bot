const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../database/pool');
const shiftRepo = require('../repositories/shiftRepository');
const shiftMemberRepo = require('../repositories/shiftMemberRepository');
const pauseRepo = require('../repositories/pauseRepository');
const weaponRepo = require('../repositories/weaponRepository');
const weaponLossRepo = require('../repositories/weaponLossRepository');
const officialWeaponRepo = require('../repositories/officialWeaponRepository');
const userRepo = require('../repositories/userRepository');
const { isAdmin, isSupervisor } = require('../utils/permissions');
const { buildShiftEmbed, buildShiftButtons, buildReportEmbed, buildWeaponLossEmbed, buildWeaponAddedEmbed } = require('../utils/embeds');
const logger = require('../utils/logger');

// Inicia um turno como UNIDADE OPERACIONAL.
// Quem executa o comando é o líder (motorista/responsável); additionalDiscordIds
// são os oficiais adicionais da unidade. É criado um único turno, um único canal
// de voz, e os armamentos de TODOS os participantes são vinculados automaticamente.
async function startShift(interaction, cfg, { callsign, vehiclePrefix, additionalDiscordIds = [], vehicle = null }) {
    const member = interaction.member;
    const guild = interaction.guild;

    const leader = await userRepo.upsert(member.id, member.user.username, member.displayName);

    const existing = await shiftRepo.findActiveByParticipant(leader.id, guild.id);
    if (existing) {
        return { error: 'Você já está em uma unidade ativa. Encerre o turno atual antes de iniciar um novo.' };
    }

    // Resolve os oficiais adicionais (ignora duplicados e o próprio líder)
    const participants = [{ userId: leader.id, discordId: member.id, role: 'LEADER' }];
    const seen = new Set([member.id]);
    const conflicts = [];

    for (const discordId of additionalDiscordIds) {
        if (seen.has(discordId)) continue;
        seen.add(discordId);

        let m;
        try {
            m = await guild.members.fetch(discordId);
        } catch {
            continue; // membro não encontrado no servidor — ignora
        }
        if (m.user.bot) continue;

        const u = await userRepo.upsert(m.id, m.user.username, m.displayName);
        const active = await shiftRepo.findActiveByParticipant(u.id, guild.id);
        if (active) {
            conflicts.push(`<@${m.id}>`);
            continue;
        }
        participants.push({ userId: u.id, discordId: m.id, role: 'MEMBER' });
    }

    if (conflicts.length > 0) {
        return { error: `Os seguintes oficiais já estão em uma unidade ativa: ${conflicts.join(', ')}. Encerre os turnos deles antes de incluí-los.` };
    }

    // Une os arsenais de todos os participantes (excluindo armas extraviadas).
    // Cada arma mantém o vínculo com o seu dono real (last_user_id).
    const serialToOwner = new Map();
    const weaponSerials = [];
    for (const p of participants) {
        const arsenal = await officialWeaponRepo.findByUser(p.userId, guild.id, { excludeLost: true });
        for (const w of arsenal) {
            if (!serialToOwner.has(w.serial_number)) {
                serialToOwner.set(w.serial_number, p.userId);
                weaponSerials.push(w.serial_number);
            }
        }
    }

    let shift, voiceChannel;

    await db.transaction(async (client) => {
        shift = await shiftRepo.create(client, {
            userId: leader.id,
            guildId: guild.id,
            callsign,
            vehiclePrefix,
            vehicleName: vehicle,
            weaponSerials,
        });
        for (const p of participants) {
            await shiftMemberRepo.add(client, shift.id, p.userId, p.role);
        }
    });

    for (const serial of weaponSerials) {
        await weaponRepo.upsert(serial, guild.id);
        await weaponRepo.setInUse(serial, guild.id, serialToOwner.get(serial), shift.id);
    }

    try {
        // Nome do canal: "Viatura-Callsign" quando há viatura, senão só callsign
        const vcName = vehicle ? `${vehicle}-${callsign}` : callsign;
        voiceChannel = await guild.channels.create({
            name: vcName,
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
    shift.members = await shiftMemberRepo.findByShift(shift.id);
    const embed = buildShiftEmbed(shift, member.user, shift.voice_channel_id);
    const buttons = buildShiftButtons('active');

    const shiftChannel = guild.channels.cache.get(cfg.shift_channel_id);
    if (!shiftChannel) return { error: 'Canal de turnos não encontrado. Use `/configurar canal-turnos`.' };

    const message = await shiftChannel.send({ embeds: [embed], components: buttons });
    await shiftRepo.updateEmbedMessage(shift.id, message.id);

    return { shift, message, weaponCount: weaponSerials.length, memberCount: participants.length };
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

    // O turno é o da unidade em que o oficial participa (líder ou membro)
    const shift = await shiftRepo.findActiveByParticipant(dbUser.id, interaction.guildId);
    if (!shift) return { error: 'Você não está em nenhuma unidade ativa.' };

    if (!shift.weapon_serials.includes(serialNumber)) {
        return { error: `A arma \`${serialNumber}\` não está vinculada a este turno.` };
    }

    // Regras de permissão de extravio:
    //  - Supervisor/Admin: qualquer arma
    //  - Líder da unidade: qualquer arma vinculada ao turno da sua unidade
    //  - Oficial comum: apenas armas que pertencem a ele
    const owner = await officialWeaponRepo.findBySerial(interaction.guildId, serialNumber);
    const isLeader = shift.user_id === dbUser.id;
    const isOwner = owner && owner.user_id === dbUser.id;
    const elevated = isAdmin(interaction.member) || await isSupervisor(interaction.member);

    if (!isOwner && !isLeader && !elevated) {
        return { error: 'Você só pode registrar extravio das suas próprias armas. Apenas o responsável da unidade ou um supervisor pode extraviar armas de outros oficiais.' };
    }

    const alreadyLost = await weaponLossRepo.existsInShift(shift.id, serialNumber);
    if (alreadyLost) {
        return { error: `A arma \`${serialNumber}\` já foi registrada como extraviada neste turno.` };
    }

    // O extravio é atribuído ao DONO da arma (quando conhecido), preservando
    // a contabilização correta no arsenal individual.
    const lossUserId = owner ? owner.user_id : dbUser.id;

    const loss = await weaponLossRepo.create({
        shiftId: shift.id,
        userId: lossUserId,
        serialNumber,
        observation,
    });

    await weaponRepo.setLost(serialNumber, interaction.guildId);

    const updatedShift = await shiftRepo.findById(shift.id);
    const leaderUser = await resolveLeaderUser(interaction, shift);
    await refreshEmbed(interaction.guild, updatedShift, leaderUser);

    const guildConfigRepo = require('../repositories/guildConfigRepository');
    const weaponChannelId = await guildConfigRepo.get(interaction.guildId, 'weapon_report_channel_id');
    const reportChannel = interaction.guild.channels.cache.get(weaponChannelId);
    if (reportChannel) {
        // Atribui o extravio ao dono da arma; registra quem reportou, se diferente
        const ownerUser = owner ? await resolveUserForEmbed(interaction, owner.discord_id) : interaction.user;
        const reportedBy = ownerUser.id !== interaction.user.id ? interaction.user : null;
        const lossEmbed = buildWeaponLossEmbed(updatedShift, ownerUser, loss, reportedBy);
        await reportChannel.send({ embeds: [lossEmbed] });
    }

    return { loss };
}

async function endShift(interaction, targetDiscordId = null, { reason = null, reasonNote = null } = {}) {
    const discordId = targetDiscordId || interaction.user.id;
    const dbUser = await userRepo.findByDiscordId(discordId);
    if (!dbUser) return { error: 'Usuário não encontrado.' };

    // O líder é shift.user_id; usamos o turno da unidade do oficial alvo
    const shift = await shiftRepo.findActiveByParticipant(dbUser.id, interaction.guildId);
    if (!shift) return { error: 'Nenhum turno ativo encontrado.' };

    if (shift.status === 'paused') {
        await pauseRepo.endActive(shift.id);
    }

    const members = await shiftMemberRepo.findByShift(shift.id);

    const totalPauseMs = await pauseRepo.sumByShift(shift.id);
    const ended = await shiftRepo.end(shift.id, totalPauseMs, reason, reasonNote);
    ended.weapon_losses = shift.weapon_losses;
    ended.members = members;

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

    // Para o embed/relatório usamos o LÍDER da unidade
    const leaderDiscordId = members.find(m => m.role === 'LEADER')?.discord_id || discordId;
    const shiftUser = await resolveUserForEmbed(interaction, leaderDiscordId);
    await refreshEmbed(interaction.guild, ended, shiftUser, true);

    const pauses = await pauseRepo.findByShift(shift.id);
    const guildConfigRepo = require('../repositories/guildConfigRepository');
    const reportChannelId = await guildConfigRepo.get(interaction.guildId, 'report_channel_id');
    const reportChannel = interaction.guild.channels.cache.get(reportChannelId);
    if (reportChannel) {
        const reportEmbed = buildReportEmbed(ended, shiftUser, pauses);
        await reportChannel.send({ embeds: [reportEmbed] });
    }

    return { shift: ended, reason };
}

// Resolve o User do LÍDER da unidade para exibir como "Responsável" no embed,
// independente de quem disparou a ação (membro, supervisor, etc.).
async function resolveLeaderUser(interaction, shift) {
    const members = shift.members || await shiftMemberRepo.findByShift(shift.id);
    const leader = members.find(m => m.role === 'LEADER');
    if (!leader) return interaction.user;
    return resolveUserForEmbed(interaction, leader.discord_id);
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
        if (!shift.members) shift.members = await shiftMemberRepo.findByShift(shift.id);
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

    const shift = await shiftRepo.findActiveByParticipant(dbUser.id, interaction.guildId);
    if (!shift) return { error: 'Você não está em nenhuma unidade ativa.' };

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
    const leaderUser = await resolveLeaderUser(interaction, shift);
    await refreshEmbed(interaction.guild, updatedShift, leaderUser);

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
