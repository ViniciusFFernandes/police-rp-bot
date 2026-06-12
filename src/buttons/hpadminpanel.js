const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
} = require('discord.js');
const hpShiftRepo      = require('../repositories/hpShiftRepository');
const hpShiftService   = require('../services/hpShiftService');
const { isHpSupervisor } = require('../utils/hpPermissions');
const { COLOR }          = require('../utils/embeds');
const { formatTimestamp, formatDuration } = require('../utils/time');
const logger = require('../utils/logger');

const PAGE_SIZE = 8;

async function renderShiftsPage(interaction, targetDiscordId, page) {
    const offset = (page - 1) * PAGE_SIZE;
    const [shifts, total] = await Promise.all([
        hpShiftRepo.findEndedByUser(targetDiscordId, interaction.guildId, PAGE_SIZE, offset),
        hpShiftRepo.countEndedByUser(targetDiscordId, interaction.guildId),
    ]);

    if (total === 0) {
        return interaction.editReply({
            content: `Nenhum turno encerrado encontrado para <@${targetDiscordId}>.`,
            components: [],
        });
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);
    let target = null;
    try { target = await interaction.guild.members.fetch(targetDiscordId); } catch { /* ok */ }

    const lines = shifts.map((s, i) => {
        const num       = offset + i + 1;
        const effective = Number(s.total_ms) - Number(s.total_pause_ms);
        return [
            `**#${num}**`,
            `> 🕐 Início: ${formatTimestamp(s.started_at)}`,
            `> 🏁 Fim: ${formatTimestamp(s.ended_at)}`,
            `> ✅ Efetivo: **${formatDuration(effective)}** · ☕ Pausa: ${formatDuration(Number(s.total_pause_ms))} · ⏸️ ${s.pause_count} pausa(s)`,
        ].join('\n');
    });

    const embed = new EmbedBuilder()
        .setColor(COLOR.INFO)
        .setTitle(`📋 Turnos HP — ${target?.displayName ?? targetDiscordId}`)
        .setThumbnail(target?.user.displayAvatarURL() ?? null)
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: `Página ${page}/${totalPages} · ${total} turno(s) · ${interaction.guild.name}` })
        .setTimestamp();

    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`hpadmin:history_shifts_page:${targetDiscordId}:${page - 1}`)
            .setLabel('◀ Anterior')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
        new ButtonBuilder()
            .setCustomId(`hpadmin:history_shifts_page:${targetDiscordId}:${page + 1}`)
            .setLabel('Próxima ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages),
    );

    return interaction.editReply({ embeds: [embed], components: [navRow] });
}

module.exports = {
    customId: 'hpadmin',

    async execute(interaction) {
        const parts  = interaction.customId.split(':');
        const action = parts[1];

        try {
            if (!await isHpSupervisor(interaction.member)) {
                const reply = { content: '❌ Acesso restrito a **Supervisores** e **Administradores** do hospital.', ephemeral: true };
                if (interaction.replied || interaction.deferred) return interaction.followUp(reply);
                return interaction.reply(reply);
            }

            // ── Turnos em Andamento ───────────────────────────────────
            if (action === 'active_shifts') {
                await interaction.deferReply({ ephemeral: true });

                const shifts = await hpShiftRepo.findAllActiveByGuild(interaction.guildId);

                if (shifts.length === 0) {
                    return interaction.editReply({ content: '✅ Nenhum turno ativo no hospital no momento.' });
                }

                const STATUS_ICON = { active: '🟢', paused: '🟡' };
                const lines = shifts.map(s => {
                    const icon  = STATUS_ICON[s.status] || '⚪';
                    const since = formatTimestamp(s.started_at);
                    return `${icon} <@${s.discord_id}> — desde ${since}`;
                });

                const embed = new EmbedBuilder()
                    .setColor(COLOR.INFO)
                    .setTitle('🚑 Turnos Ativos — Hospital')
                    .setDescription(lines.join('\n'))
                    .setFooter({ text: `${shifts.length} turno(s) ativo(s) · ${interaction.guild.name}` })
                    .setTimestamp();

                const closeSelect = new StringSelectMenuBuilder()
                    .setCustomId('hpadmin:close_shift_select')
                    .setPlaceholder('Encerrar turno de...')
                    .addOptions(
                        shifts.slice(0, 25).map(s => ({
                            label: s.display_name ?? s.discord_id,
                            description: `Status: ${s.status === 'paused' ? 'Em Pausa' : 'Em Serviço'}`,
                            value: s.discord_id,
                            emoji: STATUS_ICON[s.status] ?? '⚪',
                        }))
                    );

                return interaction.editReply({
                    embeds: [embed],
                    components: [new ActionRowBuilder().addComponents(closeSelect)],
                });
            }

            // ── Fechar Turno (seleção pelo supervisor) ────────────────
            if (action === 'close_shift_select') {
                await interaction.deferUpdate();
                const targetDiscordId = interaction.values[0];
                const result = await hpShiftService.endShift(interaction, targetDiscordId);

                if (result.error) {
                    return interaction.editReply({ content: `❌ ${result.error}`, components: [] });
                }

                const remaining = await hpShiftRepo.findAllActiveByGuild(interaction.guildId);

                if (remaining.length === 0) {
                    return interaction.editReply({
                        content: `✅ Turno de <@${targetDiscordId}> encerrado. Nenhum outro turno ativo.`,
                        embeds: [],
                        components: [],
                    });
                }

                const STATUS_ICON = { active: '🟢', paused: '🟡' };
                const lines = remaining.map(s => {
                    const icon = STATUS_ICON[s.status] || '⚪';
                    return `${icon} <@${s.discord_id}> — desde ${formatTimestamp(s.started_at)}`;
                });

                const embed = new EmbedBuilder()
                    .setColor(COLOR.INFO)
                    .setTitle('🚑 Turnos Ativos — Hospital')
                    .setDescription(lines.join('\n'))
                    .setFooter({ text: `${remaining.length} turno(s) ativo(s) · ${interaction.guild.name}` })
                    .setTimestamp();

                const closeSelect = new StringSelectMenuBuilder()
                    .setCustomId('hpadmin:close_shift_select')
                    .setPlaceholder('Encerrar turno de...')
                    .addOptions(
                        remaining.slice(0, 25).map(s => ({
                            label: s.display_name ?? s.discord_id,
                            description: `Status: ${s.status === 'paused' ? 'Em Pausa' : 'Em Serviço'}`,
                            value: s.discord_id,
                            emoji: STATUS_ICON[s.status] ?? '⚪',
                        }))
                    );

                return interaction.editReply({
                    content: `✅ Turno de <@${targetDiscordId}> encerrado.`,
                    embeds: [embed],
                    components: [new ActionRowBuilder().addComponents(closeSelect)],
                });
            }

            // ── Ver Perfil — passo 1: selecionar membro ──────────────
            if (action === 'member_profile') {
                return interaction.reply({
                    content: 'Selecione o membro para ver o perfil:',
                    components: [
                        new ActionRowBuilder().addComponents(
                            new UserSelectMenuBuilder()
                                .setCustomId('hpadmin:member_profile_user')
                                .setPlaceholder('Selecione o membro')
                        ),
                    ],
                    ephemeral: true,
                });
            }

            // ── Ver Perfil — passo 2: exibir stats ───────────────────
            if (action === 'member_profile_user') {
                await interaction.deferUpdate();
                const targetId = interaction.values[0];
                const stats    = await hpShiftRepo.getStats(targetId, interaction.guildId);

                let target = null;
                try { target = await interaction.guild.members.fetch(targetId); } catch { /* ok */ }

                if (!stats || stats.total_shifts === '0') {
                    return interaction.editReply({
                        content: `Nenhum turno encerrado encontrado para <@${targetId}> no hospital.`,
                        components: [],
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor(COLOR.INFO)
                    .setTitle(`👤 Perfil HP — ${target?.displayName ?? targetId}`)
                    .setThumbnail(target?.user.displayAvatarURL() ?? null)
                    .addFields(
                        { name: '🔢 Turnos Encerrados', value: String(stats.total_shifts),                    inline: true },
                        { name: '✅ Tempo Efetivo',      value: formatDuration(Number(stats.effective_ms)),   inline: true },
                        { name: '☕ Tempo em Pausa',     value: formatDuration(Number(stats.total_pause_ms)), inline: true },
                        { name: '⏸️ Pausas Realizadas',  value: String(stats.total_pauses),                   inline: true },
                    )
                    .setFooter({ text: interaction.guild.name })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed], components: [] });
            }

            // ── Histórico — passo 1: selecionar membro ────────────────
            if (action === 'history_shifts') {
                return interaction.reply({
                    content: 'Selecione o membro para ver o histórico de turnos:',
                    components: [
                        new ActionRowBuilder().addComponents(
                            new UserSelectMenuBuilder()
                                .setCustomId('hpadmin:history_shifts_user')
                                .setPlaceholder('Selecione o membro')
                        ),
                    ],
                    ephemeral: true,
                });
            }

            // ── Histórico — passo 2: exibir página 1 ─────────────────
            if (action === 'history_shifts_user') {
                await interaction.deferUpdate();
                const targetId = interaction.values[0];
                return renderShiftsPage(interaction, targetId, 1);
            }

            // ── Histórico — navegação de página ──────────────────────
            // customId: hpadmin:history_shifts_page:{discordId}:{page}
            if (action === 'history_shifts_page') {
                await interaction.deferUpdate();
                const targetId = parts[2];
                const page     = parseInt(parts[3], 10);
                return renderShiftsPage(interaction, targetId, page);
            }

        } catch (err) {
            logger.error('Erro no painel admin do hospital', { action, guild: interaction.guildId, error: err.message });
            const reply = { content: '❌ Ocorreu um erro. Tente novamente.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};
