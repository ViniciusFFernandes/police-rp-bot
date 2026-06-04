const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiftRepo     = require('../../repositories/shiftRepository');
const pauseRepo     = require('../../repositories/pauseRepository');
const weaponRepo    = require('../../repositories/weaponRepository');
const { isAdmin, isSupervisor } = require('../../utils/permissions');
const { formatTimestamp, formatDuration } = require('../../utils/time');
const { COLOR } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('turno')
        .setDescription('Gerenciamento de turnos ativos')
        .addSubcommand(sub =>
            sub.setName('listar')
                .setDescription('Lista todos os turnos ativos no servidor')
        )
        .addSubcommand(sub =>
            sub.setName('forcar-encerrar')
                .setDescription('Encerra forçadamente um turno preso (sem embed ou com erro)')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Oficial cujo turno será encerrado (padrão: você mesmo)')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const sub    = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        // ── /turno listar ──────────────────────────────────────────────
        if (sub === 'listar') {
            if (!isAdmin(interaction.member) && !await isSupervisor(interaction.member)) {
                return interaction.editReply({ content: '❌ Apenas **Administradores** e **Supervisores** podem listar turnos.' });
            }

            const shifts = await shiftRepo.findAllActiveByGuild(guildId);

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
                .setFooter({ text: `${shifts.length} turno(s) ativo(s)` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── /turno forcar-encerrar ─────────────────────────────────────
        if (sub === 'forcar-encerrar') {
            const targetUser = interaction.options.getUser('usuario') ?? interaction.user;
            const isSelf     = targetUser.id === interaction.user.id;

            if (!isSelf && !isAdmin(interaction.member) && !await isSupervisor(interaction.member)) {
                return interaction.editReply({ content: '❌ Apenas **Administradores** e **Supervisores** podem encerrar turnos de outros oficiais.' });
            }

            // Busca turno ativo pelo líder
            const dbUser = await require('../../repositories/userRepository').findByDiscordId(targetUser.id);
            if (!dbUser) {
                return interaction.editReply({ content: `⚠️ <@${targetUser.id}> não tem registro no sistema.` });
            }

            const shift = await shiftRepo.findActiveByUser(dbUser.id, guildId);
            if (!shift) {
                return interaction.editReply({ content: `⚠️ Nenhum turno ativo encontrado para <@${targetUser.id}>.` });
            }

            // Calcula pausas acumuladas
            const pauses      = await pauseRepo.findByShift(shift.id);
            const totalPauseMs = pauses.reduce((sum, p) => sum + (p.duration_ms || 0), 0);

            // Encerra no banco
            await shiftRepo.end(shift.id, totalPauseMs, 'force_closed');

            // Libera armas
            if (shift.weapon_serials?.length) {
                await Promise.all(
                    shift.weapon_serials.map(serial =>
                        weaponRepo.updateStatus(serial, guildId, 'available', null, null).catch(() => {})
                    )
                );
            }

            // Tenta excluir canal de voz órfão
            if (shift.voice_channel_id) {
                const vc = interaction.guild.channels.cache.get(shift.voice_channel_id);
                if (vc) await vc.delete().catch(() => {});
            }

            // Tenta desativar o embed órfão (remove botões)
            if (shift.embed_message_id) {
                const cfg = await require('../../repositories/guildConfigRepository').get(guildId, 'shift_channel_id');
                if (cfg) {
                    const ch = interaction.guild.channels.cache.get(cfg);
                    if (ch) {
                        const msg = await ch.messages.fetch(shift.embed_message_id).catch(() => null);
                        if (msg) await msg.edit({ components: [] }).catch(() => {});
                    }
                }
            }

            const elapsed = shift.started_at
                ? formatDuration(Date.now() - new Date(shift.started_at).getTime())
                : '—';

            return interaction.editReply({
                content:
                    `✅ Turno **${shift.callsign}** encerrado forçadamente.\n` +
                    `👤 Oficial: <@${targetUser.id}>\n` +
                    `⏱️ Duração total: **${elapsed}**`,
            });
        }
    },
};
