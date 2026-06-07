const {
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
    UserSelectMenuBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const userRepo            = require('../repositories/userRepository');
const officialProfileRepo = require('../repositories/officialProfileRepository');
const shiftRepo           = require('../repositories/shiftRepository');
const shiftService        = require('../services/shiftService');
const officialWeaponRepo  = require('../repositories/officialWeaponRepository');
const callsignBoardService = require('../services/callsignBoardService');
const { isIAStaff } = require('../utils/permissions');
const { formatDuration, formatTimestamp } = require('../utils/time');
const { COLOR } = require('../utils/embeds');
const logger = require('../utils/logger');

const PAGE_SIZE = 8;

async function renderShiftsPage(interaction, targetId, page) {
    const target = await interaction.guild.members.fetch(targetId).catch(() => null);
    const dbUser = await userRepo.findByDiscordId(targetId);

    if (!dbUser) {
        return interaction.editReply({
            content: `Nenhum registro encontrado para <@${targetId}> neste servidor.`,
            components: [],
        });
    }

    const offset = (page - 1) * PAGE_SIZE;
    const [shifts, total] = await Promise.all([
        shiftRepo.findEndedByUser(dbUser.id, interaction.guildId, PAGE_SIZE, offset),
        shiftRepo.countEndedByUser(dbUser.id, interaction.guildId),
    ]);

    if (total === 0) {
        return interaction.editReply({
            content: `Nenhum turno encerrado encontrado para <@${targetId}>.`,
            components: [],
        });
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const lines = shifts.map((s, i) => {
        const num       = offset + i + 1;
        const effective = Number(s.total_ms) - Number(s.total_pause_ms_calc);
        const losses    = s.weapon_serials?.length ? `🔫 ${s.weapon_serials.length} arma(s)` : '🔫 sem armas';
        return [
            `**#${num} — ${s.callsign}** · Viatura \`${s.vehicle_prefix}\``,
            `> 🕐 Início: ${formatTimestamp(s.started_at)}`,
            `> 🏁 Fim: ${formatTimestamp(s.ended_at)}`,
            `> ✅ Efetivo: **${formatDuration(effective)}** · ☕ Pausa: ${formatDuration(Number(s.total_pause_ms_calc))} · ⏸️ ${s.pause_count} pausa(s)`,
            `> ${losses}`,
        ].join('\n');
    });

    const embed = new EmbedBuilder()
        .setColor(COLOR.INFO)
        .setTitle(`📋 Turnos — ${target?.displayName ?? targetId}`)
        .setThumbnail(target?.user.displayAvatarURL() ?? null)
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: `Página ${page}/${totalPages} · ${total} turno(s) no total · ${interaction.guild.name}` })
        .setTimestamp();

    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`adminpanel:history_shifts_page:${targetId}:${page - 1}`)
            .setLabel('◀ Anterior')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
        new ButtonBuilder()
            .setCustomId(`adminpanel:history_shifts_page:${targetId}:${page + 1}`)
            .setLabel('Próxima ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages),
    );

    return interaction.editReply({ embeds: [embed], components: [navRow] });
}

function userSelectRow(customId, placeholder) {
    return new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
    );
}

module.exports = {
    customId: 'adminpanel',

    async execute(interaction) {
        const parts  = interaction.customId.split(':');
        const action = parts[1];

        try {
            // Supervisores, administradores e Assuntos Internos
            if (!await isIAStaff(interaction.member)) {
                const reply = { content: '❌ Acesso restrito a **Supervisores**, **Administradores** e **Assuntos Internos**.', ephemeral: true };
                if (interaction.replied || interaction.deferred) return interaction.followUp(reply);
                return interaction.reply(reply);
            }

            // ── Definir Perfil — passo 1: selecionar oficial ──────────
            if (action === 'profile_define') {
                return interaction.reply({
                    content: 'Selecione o oficial cujo perfil deseja definir:',
                    components: [userSelectRow('adminpanel:profile_define_user', 'Selecione o oficial')],
                    ephemeral: true,
                });
            }

            // ── Definir Perfil — passo 2: abrir modal pré-preenchido ──
            if (action === 'profile_define_user') {
                const targetUser = interaction.values[0];
                const profile    = await officialProfileRepo.findByDiscordId(targetUser, interaction.guildId);

                const modal = new ModalBuilder()
                    .setCustomId(`modal:adminpanel_profile_define:${targetUser}`)
                    .setTitle('Definir Perfil do Oficial');

                const districtInput = new TextInputBuilder()
                    .setCustomId('distrito')
                    .setLabel('Distrito (ex: 1, 3, 4B)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(10);

                const callsignInput = new TextInputBuilder()
                    .setCustomId('callsign')
                    .setLabel('Callsign (ex: 07, 12, 20)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(10);

                const badgeInput = new TextInputBuilder()
                    .setCustomId('distintivo')
                    .setLabel('Distintivo / Badge (ex: 4521)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(20);

                const nomeInput = new TextInputBuilder()
                    .setCustomId('nome')
                    .setLabel('Nome do Oficial')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(50);

                if (profile) {
                    districtInput.setValue(profile.district);
                    callsignInput.setValue(profile.callsign_num);
                    if (profile.badge_num)    badgeInput.setValue(profile.badge_num);
                    if (profile.display_name) nomeInput.setValue(profile.display_name);
                }

                modal.addComponents(
                    new ActionRowBuilder().addComponents(districtInput),
                    new ActionRowBuilder().addComponents(callsignInput),
                    new ActionRowBuilder().addComponents(badgeInput),
                    new ActionRowBuilder().addComponents(nomeInput),
                );

                return interaction.showModal(modal);
            }

            // ── Remover Callsign — passo 1: selecionar oficial ──
            if (action === 'callsign_remove') {
                return interaction.reply({
                    content: 'Selecione o oficial cujo callsign deseja remover (ex: oficial demitido):',
                    components: [userSelectRow('adminpanel:callsign_remove_user', 'Selecione o oficial')],
                    ephemeral: true,
                });
            }

            // ── Remover Callsign — passo 2: confirmar ───
            if (action === 'callsign_remove_user') {
                await interaction.deferUpdate();
                const targetId = interaction.values[0];
                const profile  = await officialProfileRepo.findByDiscordId(targetId, interaction.guildId);

                if (!profile) {
                    return interaction.editReply({
                        content: `⚠️ <@${targetId}> não possui perfil no quadro de callsigns.`,
                        components: [],
                    });
                }

                const confirmRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`adminpanel:callsign_remove_confirm:${targetId}`)
                        .setLabel('Confirmar Remoção')
                        .setEmoji('🗑️')
                        .setStyle(ButtonStyle.Danger),
                );

                return interaction.editReply({
                    content: `Confirma a remoção de **${profile.display_name ?? profile.discord_id}** ` +
                        `(Distrito ${profile.district} · Callsign ${profile.callsign_num}) do quadro de callsigns?`,
                    components: [confirmRow],
                });
            }

            // ── Remover Callsign — passo 3: executar ────
            // customId: adminpanel:callsign_remove_confirm:{targetId}
            if (action === 'callsign_remove_confirm') {
                await interaction.deferUpdate();
                const targetId = parts[2];
                const dbUser   = await userRepo.findByDiscordId(targetId);

                const removed = dbUser ? await officialProfileRepo.remove(dbUser.id, interaction.guildId) : false;

                if (!removed) {
                    return interaction.editReply({ content: '⚠️ Não foi possível remover — perfil não encontrado.', components: [] });
                }

                await callsignBoardService.refresh(interaction.guild);

                return interaction.editReply({
                    content: `✅ <@${targetId}> foi removido do quadro de callsigns.`,
                    components: [],
                });
            }

            // ── Resumo — passo 1: selecionar oficial ─────────────────
            if (action === 'history_resume') {
                return interaction.reply({
                    content: 'Selecione o oficial para ver o resumo:',
                    components: [userSelectRow('adminpanel:history_resume_user', 'Selecione o oficial')],
                    ephemeral: true,
                });
            }

            // ── Resumo — passo 2: exibir stats ───────────────────────
            if (action === 'history_resume_user') {
                await interaction.deferUpdate();
                const targetId = interaction.values[0];
                const target   = await interaction.guild.members.fetch(targetId).catch(() => null);
                const stats    = await userRepo.getStats(targetId, interaction.guildId);

                if (!stats || stats.total_shifts === '0') {
                    return interaction.editReply({
                        content: `Nenhum turno encerrado encontrado para <@${targetId}> neste servidor.`,
                        components: [],
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor(COLOR.INFO)
                    .setTitle(`📊 Resumo — ${target?.displayName ?? targetId}`)
                    .setThumbnail(target?.user.displayAvatarURL() ?? null)
                    .addFields(
                        { name: '🔢 Turnos Encerrados', value: String(stats.total_shifts),                          inline: true },
                        { name: '✅ Tempo Efetivo',      value: formatDuration(Number(stats.effective_ms)),          inline: true },
                        { name: '☕ Tempo em Pausa',     value: formatDuration(Number(stats.total_pause_ms)),        inline: true },
                        { name: '⏸️ Pausas Realizadas',  value: String(stats.total_pauses),                         inline: true },
                        { name: '⚠️ Armas Extraviadas',  value: String(stats.total_losses),                         inline: true },
                    )
                    .setFooter({ text: interaction.guild.name })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed], components: [] });
            }

            // ── Histórico de Turnos — passo 1: selecionar oficial ────
            if (action === 'history_shifts') {
                return interaction.reply({
                    content: 'Selecione o oficial para ver o histórico de turnos:',
                    components: [userSelectRow('adminpanel:history_shifts_user', 'Selecione o oficial')],
                    ephemeral: true,
                });
            }

            // ── Histórico de Turnos — passo 2: exibir (página 1) ────
            if (action === 'history_shifts_user') {
                await interaction.deferUpdate();
                const targetId = interaction.values[0];
                return renderShiftsPage(interaction, targetId, 1);
            }

            // ── Histórico de Turnos — navegação de página ─────────────
            // customId: adminpanel:history_shifts_page:{targetId}:{page}
            if (action === 'history_shifts_page') {
                await interaction.deferUpdate();
                const targetId = parts[2];
                const page     = parseInt(parts[3], 10);
                return renderShiftsPage(interaction, targetId, page);
            }

            // ── Turnos em Andamento ───────────────────────────────────
            if (action === 'active_shifts') {
                await interaction.deferReply({ ephemeral: true });

                const shifts = await shiftRepo.findAllActiveByGuild(interaction.guildId);

                if (shifts.length === 0) {
                    return interaction.editReply({ content: '✅ Nenhum turno ativo no momento.' });
                }

                const STATUS_ICON = { active: '🟢', paused: '🟡' };
                const lines = shifts.map(s => {
                    const icon  = STATUS_ICON[s.status] || '⚪';
                    const since = formatTimestamp(s.started_at);
                    return `${icon} **${s.callsign}** — <@${s.user_discord_id}> — desde ${since}`;
                });

                const embed = new EmbedBuilder()
                    .setColor(COLOR.INFO)
                    .setTitle('🚔 Turnos Ativos')
                    .setDescription(lines.join('\n'))
                    .setFooter({ text: `${shifts.length} turno(s) ativo(s) · ${interaction.guild.name}` })
                    .setTimestamp();

                const closeSelect = new StringSelectMenuBuilder()
                    .setCustomId('adminpanel:close_shift_select')
                    .setPlaceholder('Fechar turno...')
                    .addOptions(
                        shifts.slice(0, 25).map(s => ({
                            label: s.callsign,
                            description: s.user_display_name ?? s.user_discord_id,
                            value: s.user_discord_id,
                            emoji: STATUS_ICON[s.status] ?? '⚪',
                        }))
                    );

                return interaction.editReply({
                    embeds: [embed],
                    components: [new ActionRowBuilder().addComponents(closeSelect)],
                });
            }

            // ── Fechar Turno (seleção do supervisor) ──────────────────
            if (action === 'close_shift_select') {
                await interaction.deferUpdate();

                const targetDiscordId = interaction.values[0];
                const result = await shiftService.endShift(interaction, targetDiscordId, { reason: 'force_closed' });

                if (result.error) {
                    return interaction.editReply({ content: `❌ ${result.error}`, components: [] });
                }

                const remaining = await shiftRepo.findAllActiveByGuild(interaction.guildId);

                if (remaining.length === 0) {
                    return interaction.editReply({
                        content: `✅ Turno de <@${targetDiscordId}> encerrado. Nenhum outro turno ativo.`,
                        embeds: [],
                        components: [],
                    });
                }

                const STATUS_ICON = { active: '🟢', paused: '🟡' };
                const lines = remaining.map(s => {
                    const icon  = STATUS_ICON[s.status] || '⚪';
                    const since = formatTimestamp(s.started_at);
                    return `${icon} **${s.callsign}** — <@${s.user_discord_id}> — desde ${since}`;
                });

                const embed = new EmbedBuilder()
                    .setColor(COLOR.INFO)
                    .setTitle('🚔 Turnos Ativos')
                    .setDescription(lines.join('\n'))
                    .setFooter({ text: `${remaining.length} turno(s) ativo(s) · ${interaction.guild.name}` })
                    .setTimestamp();

                const closeSelect = new StringSelectMenuBuilder()
                    .setCustomId('adminpanel:close_shift_select')
                    .setPlaceholder('Fechar turno...')
                    .addOptions(
                        remaining.slice(0, 25).map(s => ({
                            label: s.callsign,
                            description: s.user_display_name ?? s.user_discord_id,
                            value: s.user_discord_id,
                            emoji: STATUS_ICON[s.status] ?? '⚪',
                        }))
                    );

                return interaction.editReply({
                    content: `✅ Turno de <@${targetDiscordId}> encerrado.`,
                    embeds: [embed],
                    components: [new ActionRowBuilder().addComponents(closeSelect)],
                });
            }

            if (action === 'announcement') {
                const modal = new ModalBuilder()
                    .setCustomId('modal:adminpanel_announcement')
                    .setTitle('Comunicado Geral');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('titulo')
                            .setLabel('Título do comunicado')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(150)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('mensagem')
                            .setLabel('Mensagem')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                            .setMaxLength(3500)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('emojis')
                            .setLabel('Emojis para reação (separados por espaço)')
                            .setPlaceholder('ex: ✅ 👍')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false)
                            .setMaxLength(100)
                    ),
                );
                return interaction.showModal(modal);
            }

            // ── Arsenal — passo 1: selecionar oficial ─────────────────
            if (action === 'history_arsenal') {
                return interaction.reply({
                    content: 'Selecione o oficial para ver o arsenal:',
                    components: [userSelectRow('adminpanel:history_arsenal_user', 'Selecione o oficial')],
                    ephemeral: true,
                });
            }

            // ── Arsenal — passo 2: exibir ─────────────────────────────
            if (action === 'history_arsenal_user') {
                await interaction.deferUpdate();
                const targetId = interaction.values[0];
                const target   = await interaction.guild.members.fetch(targetId).catch(() => null);
                const dbUser   = await userRepo.findByDiscordId(targetId);

                if (!dbUser) {
                    return interaction.editReply({
                        content: `Nenhum registro encontrado para <@${targetId}> neste servidor.`,
                        components: [],
                    });
                }

                const weapons = await officialWeaponRepo.getArsenalHistory(dbUser.id, interaction.guildId);

                if (weapons.length === 0) {
                    return interaction.editReply({
                        content: `<@${targetId}> não possui armas cadastradas no arsenal deste servidor.`,
                        components: [],
                    });
                }

                const statusEmoji = { available: '🟢', in_use: '🔵', lost: '🔴' };
                const lines = weapons.map(w => {
                    const emoji  = statusEmoji[w.status] ?? '⚪';
                    const status = w.status === 'lost' ? '**EXTRAVIADA**' : w.status === 'in_use' ? 'Em Uso' : 'Disponível';
                    return [
                        `${emoji} **${w.weapon_name}** — \`${w.serial_number}\` — ${status}`,
                        `> 📅 Cadastrada: ${formatTimestamp(w.registered_at)}`,
                        `> 🔄 Usada em **${w.times_used}** turno(s)${w.last_used_at ? ` · Último uso: ${formatTimestamp(w.last_used_at)}` : ''}`,
                        w.times_lost > 0
                            ? `> ⚠️ Extraviada **${w.times_lost}** vez(es)`
                            : `> ✅ Nenhum extravio registrado`,
                    ].join('\n');
                });

                const totalLost   = weapons.filter(w => w.status === 'lost').length;
                const totalActive = weapons.length - totalLost;

                const embed = new EmbedBuilder()
                    .setColor(totalLost > 0 ? COLOR.LOSS : COLOR.INFO)
                    .setTitle(`🗄️ Arsenal — ${target?.displayName ?? targetId}`)
                    .setThumbnail(target?.user.displayAvatarURL() ?? null)
                    .setDescription(lines.join('\n\n'))
                    .setFooter({ text: `${totalActive} ativa(s) · ${totalLost} extraviada(s) · ${interaction.guild.name}` })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed], components: [] });
            }
        } catch (err) {
            logger.error('Erro no painel administrativo', { action, guild: interaction.guildId, error: err.message });
            const reply = { content: '❌ Ocorreu um erro. Tente novamente.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};
