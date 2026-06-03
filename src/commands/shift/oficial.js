const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userRepo            = require('../../repositories/userRepository');
const officialProfileRepo = require('../../repositories/officialProfileRepository');
const unitRepo            = require('../../repositories/unitRepository');
const { isAdmin, isSupervisor } = require('../../utils/permissions');
const { formatTimestamp } = require('../../utils/time');
const { COLOR } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oficial')
        .setDescription('Gerencia o perfil operacional do oficial')
        .addSubcommand(sub =>
            sub.setName('definir')
                .setDescription('Define seu distrito e callsign para uso nos turnos')
                .addStringOption(opt =>
                    opt.setName('distrito')
                        .setDescription('Número ou código do seu distrito (ex: 1, 3, 4B)')
                        .setRequired(true)
                        .setMaxLength(10)
                )
                .addStringOption(opt =>
                    opt.setName('callsign')
                        .setDescription('Seu número de callsign (ex: 12, 07, 20)')
                        .setRequired(true)
                        .setMaxLength(10)
                )
        )
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('Exibe o perfil operacional de um oficial')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Oficial a consultar (padrão: você mesmo)')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('editar')
                .setDescription('Edita o perfil de outro oficial (supervisores e administradores)')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Oficial a editar')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('distrito')
                        .setDescription('Novo distrito')
                        .setRequired(true)
                        .setMaxLength(10)
                )
                .addStringOption(opt =>
                    opt.setName('callsign')
                        .setDescription('Novo callsign')
                        .setRequired(true)
                        .setMaxLength(10)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const sub     = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        // ── /oficial definir ───────────────────────────────────────
        if (sub === 'definir') {
            const district    = interaction.options.getString('distrito').trim().toUpperCase();
            const callsignNum = interaction.options.getString('callsign').trim();

            const dbUser = await userRepo.upsert(
                interaction.user.id,
                interaction.user.username,
                interaction.member.displayName,
            );

            await officialProfileRepo.upsert(dbUser.id, guildId, district, callsignNum);

            // Monta preview do callsign com as unidades cadastradas
            const units = await unitRepo.findActive(guildId);
            const preview = units.length > 0
                ? units.slice(0, 3).map(u => `\`${district}-${u.name}-${callsignNum}\``).join(', ') +
                  (units.length > 3 ? ` e mais ${units.length - 3}...` : '')
                : `\`${district}-<unidade>-${callsignNum}\``;

            return interaction.editReply({
                content:
                    `✅ **Perfil atualizado com sucesso!**\n` +
                    `📍 Distrito: **${district}**\n` +
                    `📟 Callsign: **${callsignNum}**\n\n` +
                    `Ao iniciar um turno, seu callsign será montado como: ${preview}\n` +
                    `Use \`/iniciar\` para abrir uma unidade.`,
            });
        }

        // ── /oficial ver ───────────────────────────────────────────
        if (sub === 'ver') {
            const targetUser = interaction.options.getUser('usuario') ?? interaction.user;
            const isSelf     = targetUser.id === interaction.user.id;

            // Apenas supervisor/admin pode ver perfil de outros
            if (!isSelf && !isAdmin(interaction.member) && !await isSupervisor(interaction.member)) {
                return interaction.editReply({
                    content: '❌ Você não tem permissão para ver o perfil de outros oficiais.',
                });
            }

            const profile = await officialProfileRepo.findByDiscordId(targetUser.id, guildId);

            if (!profile) {
                const hint = isSelf
                    ? 'Use `/oficial definir` para configurar seu perfil.'
                    : `O oficial <@${targetUser.id}> ainda não configurou o perfil neste servidor.`;
                return interaction.editReply({ content: `⚠️ Nenhum perfil encontrado. ${hint}` });
            }

            const embed = new EmbedBuilder()
                .setColor(COLOR.INFO)
                .setTitle(`👮 Perfil Operacional — ${targetUser.displayName ?? targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: '📍 Distrito',  value: profile.district,     inline: true },
                    { name: '📟 Callsign',  value: profile.callsign_num, inline: true },
                    { name: '🕐 Atualizado', value: formatTimestamp(profile.updated_at), inline: true },
                )
                .setFooter({ text: interaction.guild.name })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── /oficial editar ────────────────────────────────────────
        if (sub === 'editar') {
            if (!isAdmin(interaction.member) && !await isSupervisor(interaction.member)) {
                return interaction.editReply({
                    content: '❌ Apenas **Administradores** e **Supervisores** podem editar o perfil de outros oficiais.',
                });
            }

            const targetUser  = interaction.options.getUser('usuario');
            const district    = interaction.options.getString('distrito').trim().toUpperCase();
            const callsignNum = interaction.options.getString('callsign').trim();

            const dbUser = await userRepo.upsert(
                targetUser.id,
                targetUser.username,
                (await interaction.guild.members.fetch(targetUser.id).catch(() => null))?.displayName ?? targetUser.username,
            );

            await officialProfileRepo.upsert(dbUser.id, guildId, district, callsignNum);

            return interaction.editReply({
                content:
                    `✅ Perfil de <@${targetUser.id}> atualizado.\n` +
                    `📍 Distrito: **${district}** · 📟 Callsign: **${callsignNum}**`,
            });
        }
    },
};
