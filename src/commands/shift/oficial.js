const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userRepo               = require('../../repositories/userRepository');
const officialProfileRepo    = require('../../repositories/officialProfileRepository');
const unitRepo               = require('../../repositories/unitRepository');
const callsignBoardService   = require('../../services/callsignBoardService');
const { isIAStaff } = require('../../utils/permissions');
const { formatTimestamp } = require('../../utils/time');
const { COLOR } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oficial')
        .setDescription('Gerencia o perfil operacional do oficial')
        .addSubcommand(sub =>
            sub.setName('definir')
                .setDescription('Define distrito e callsign de um oficial (próprio ou de outro, se supervisor/admin)')
                .addStringOption(opt =>
                    opt.setName('distrito')
                        .setDescription('Número ou código do distrito (ex: 1, 3, 4B)')
                        .setRequired(true)
                        .setMaxLength(10)
                )
                .addStringOption(opt =>
                    opt.setName('callsign')
                        .setDescription('Número do callsign (ex: 12, 07, 20)')
                        .setRequired(true)
                        .setMaxLength(10)
                )
                .addStringOption(opt =>
                    opt.setName('distintivo')
                        .setDescription('Número do distintivo/badge do oficial (ex: 4521)')
                        .setRequired(false)
                        .setMaxLength(20)
                )
                .addStringOption(opt =>
                    opt.setName('nome')
                        .setDescription('Nome do oficial — define o apelido como {distintivo}-{callsign} | Nome')
                        .setRequired(false)
                        .setMaxLength(50)
                )
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Oficial a definir (somente supervisores/admins) — padrão: você mesmo')
                        .setRequired(false)
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
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const sub     = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        // ── /oficial definir ───────────────────────────────────────
        if (sub === 'definir') {
            // Restrito a supervisores, administradores e Assuntos Internos
            if (!await isIAStaff(interaction.member)) {
                return interaction.editReply({
                    content: '❌ Apenas **Administradores**, **Supervisores** e **Assuntos Internos** podem definir perfis de oficiais.',
                });
            }

            const district    = interaction.options.getString('distrito').trim().toUpperCase();
            const callsignNum = interaction.options.getString('callsign').trim();
            const badgeNum    = interaction.options.getString('distintivo')?.trim() ?? null;
            const nome        = interaction.options.getString('nome')?.trim() ?? null;
            const targetUser  = interaction.options.getUser('usuario') ?? null;

            const isSelf = !targetUser || targetUser.id === interaction.user.id;

            const subject = isSelf ? interaction.member : await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const subjectUser = isSelf ? interaction.user : (subject?.user ?? targetUser);

            // Se nome foi informado, define o apelido e usa o nome como display_name no banco
            let displayName = subject?.displayName ?? subjectUser.username;
            if (nome) {
                // Badge efetivo: o novo (se alterado agora) ou o já salvo no perfil
                const existingProfile = await officialProfileRepo.findByDiscordId(subjectUser.id, guildId);
                const effectiveBadge  = badgeNum ?? existingProfile?.badge_num ?? null;
                const nickname        = effectiveBadge
                    ? `${effectiveBadge}-${callsignNum} | ${nome}`
                    : `${callsignNum} | ${nome}`;

                if (subject) {
                    await subject.setNickname(nickname).catch(() => {}); // silencioso se sem permissão
                }
                displayName = nome;
            }

            const dbUser = await userRepo.upsert(
                subjectUser.id,
                subjectUser.username,
                displayName,
            );

            await officialProfileRepo.upsert(dbUser.id, guildId, district, callsignNum, badgeNum);

            // Atualiza o quadro de callsigns em background (silencioso se não configurado)
            callsignBoardService.refresh(interaction.guild).catch(() => {});

            if (isSelf) {
                const units = await unitRepo.findActive(guildId);
                const preview = units.length > 0
                    ? units.slice(0, 3).map(u => `\`${district}-${u.name}-${callsignNum}\``).join(', ') +
                      (units.length > 3 ? ` e mais ${units.length - 3}...` : '')
                    : `\`${district}-<unidade>-${callsignNum}\``;

                return interaction.editReply({
                    content:
                        `✅ **Perfil atualizado!**\n` +
                        `📍 Distrito: **${district}** · 📟 Callsign: **${callsignNum}**` +
                        (badgeNum ? ` · 🪪 Distintivo: **${badgeNum}**` : '') +
                        (nome ? ` · 👤 Nome: **${nome}**` : '') + '\n\n' +
                        `Seu callsign será montado como: ${preview}\n` +
                        `Use \`/iniciar\` para abrir uma unidade.`,
                });
            }

            return interaction.editReply({
                content:
                    `✅ Perfil de <@${subjectUser.id}> atualizado.\n` +
                    `📍 Distrito: **${district}** · 📟 Callsign: **${callsignNum}**` +
                    (badgeNum ? ` · 🪪 Distintivo: **${badgeNum}**` : '') +
                    (nome ? ` · 👤 Nome: **${nome}**` : ''),
            });
        }

        // ── /oficial ver ───────────────────────────────────────────
        if (sub === 'ver') {
            const targetUser = interaction.options.getUser('usuario') ?? interaction.user;
            const isSelf     = targetUser.id === interaction.user.id;

            if (!isSelf && !await isIAStaff(interaction.member)) {
                return interaction.editReply({
                    content: '❌ Você não tem permissão para ver o perfil de outros oficiais.',
                });
            }

            const profile = await officialProfileRepo.findByDiscordId(targetUser.id, guildId);

            if (!profile) {
                const hint = isSelf
                    ? 'Solicite a um supervisor que configure seu perfil.'
                    : `<@${targetUser.id}> ainda não possui perfil configurado neste servidor.`;
                return interaction.editReply({ content: `⚠️ Nenhum perfil encontrado. ${hint}` });
            }

            const embed = new EmbedBuilder()
                .setColor(COLOR.INFO)
                .setTitle(`👮 Perfil Operacional — ${targetUser.displayName ?? targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: '📍 Distrito',    value: profile.district,         inline: true },
                    { name: '📟 Callsign',    value: profile.callsign_num,     inline: true },
                    { name: '🪪 Distintivo',  value: profile.badge_num ? profile.badge_num.padStart(4, '0') : '—', inline: true },
                    { name: '👤 Nome',        value: profile.display_name || '—', inline: true },
                    { name: '🕐 Atualizado',  value: formatTimestamp(profile.updated_at), inline: true },
                )
                .setFooter({ text: interaction.guild.name })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    },
};
