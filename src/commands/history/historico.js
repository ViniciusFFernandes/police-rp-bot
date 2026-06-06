const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userRepo = require('../../repositories/userRepository');
const shiftRepo = require('../../repositories/shiftRepository');
const officialWeaponRepo = require('../../repositories/officialWeaponRepository');
const { formatDuration, formatTimestamp } = require('../../utils/time');
const { COLOR } = require('../../utils/embeds');
const { isIAStaff } = require('../../utils/permissions');

const PAGE_SIZE = 8;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('historico')
        .setDescription('Histórico de um oficial')
        .addSubcommand(sub =>
            sub.setName('resumo')
                .setDescription('Resumo geral de turnos e armamentos do oficial')
                .addUserOption(opt =>
                    opt.setName('usuario').setDescription('O oficial a consultar').setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('turnos')
                .setDescription('Lista detalhada dos turnos encerrados do oficial')
                .addUserOption(opt =>
                    opt.setName('usuario').setDescription('O oficial a consultar').setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName('pagina')
                        .setDescription('Número da página (padrão: 1)')
                        .setMinValue(1)
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('arsenal')
                .setDescription('Histórico detalhado do arsenal do oficial, incluindo extravios')
                .addUserOption(opt =>
                    opt.setName('usuario').setDescription('O oficial a consultar').setRequired(true)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // Supervisores, administradores e Assuntos Internos podem consultar históricos
        if (!await isIAStaff(interaction.member)) {
            return interaction.editReply({
                content: '❌ Você não tem permissão para consultar históricos. Este comando é restrito a supervisores.',
            });
        }

        const sub    = interaction.options.getSubcommand();
        const target = interaction.options.getUser('usuario');
        const guildId = interaction.guildId;

        const dbUser = await userRepo.findByDiscordId(target.id);
        if (!dbUser) {
            return interaction.editReply({
                content: `Nenhum registro encontrado para <@${target.id}> neste servidor.`,
            });
        }

        // ── /historico resumo ──────────────────────────────────────
        if (sub === 'resumo') {
            const stats = await userRepo.getStats(target.id, guildId);

            if (!stats || stats.total_shifts === '0') {
                return interaction.editReply({
                    content: `Nenhum turno encerrado encontrado para <@${target.id}> neste servidor.`,
                });
            }

            const embed = new EmbedBuilder()
                .setColor(COLOR.INFO)
                .setTitle(`📊 Resumo — ${target.displayName ?? target.username}`)
                .setThumbnail(target.displayAvatarURL())
                .addFields(
                    { name: '🔢 Turnos Encerrados', value: String(stats.total_shifts), inline: true },
                    { name: '✅ Tempo Efetivo',      value: formatDuration(Number(stats.effective_ms)), inline: true },
                    { name: '☕ Tempo em Pausa',     value: formatDuration(Number(stats.total_pause_ms)), inline: true },
                    { name: '⏸️ Pausas Realizadas',  value: String(stats.total_pauses), inline: true },
                    { name: '⚠️ Armas Extraviadas',  value: String(stats.total_losses), inline: true },
                )
                .setFooter({ text: `Use /historico turnos e /historico arsenal para detalhes · ${interaction.guild.name}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── /historico turnos ──────────────────────────────────────
        if (sub === 'turnos') {
            const page   = (interaction.options.getInteger('pagina') ?? 1) - 1;
            const offset = page * PAGE_SIZE;

            const [shifts, total] = await Promise.all([
                shiftRepo.findEndedByUser(dbUser.id, guildId, PAGE_SIZE, offset),
                shiftRepo.countEndedByUser(dbUser.id, guildId),
            ]);

            if (total === 0) {
                return interaction.editReply({
                    content: `Nenhum turno encerrado encontrado para <@${target.id}> neste servidor.`,
                });
            }

            const totalPages = Math.ceil(total / PAGE_SIZE);
            const currentPage = page + 1;

            const lines = shifts.map((s, i) => {
                const num       = offset + i + 1;
                const effective = Number(s.total_ms) - Number(s.total_pause_ms_calc);
                const losses    = s.weapon_serials?.length
                    ? `🔫 ${s.weapon_serials.length} arma(s)`
                    : '🔫 sem armas';
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
                .setTitle(`📋 Turnos — ${target.displayName ?? target.username}`)
                .setThumbnail(target.displayAvatarURL())
                .setDescription(lines.join('\n\n'))
                .setFooter({ text: `Página ${currentPage}/${totalPages} · ${total} turno(s) no total · ${interaction.guild.name}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── /historico arsenal ─────────────────────────────────────
        if (sub === 'arsenal') {
            const weapons = await officialWeaponRepo.getArsenalHistory(dbUser.id, guildId);

            if (weapons.length === 0) {
                return interaction.editReply({
                    content: `<@${target.id}> não possui armas cadastradas no arsenal deste servidor.`,
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
                .setTitle(`🗄️ Arsenal — ${target.displayName ?? target.username}`)
                .setThumbnail(target.displayAvatarURL())
                .setDescription(lines.join('\n\n'))
                .setFooter({ text: `${totalActive} ativa(s) · ${totalLost} extraviada(s) · ${interaction.guild.name}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    },
};
