const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const weaponRepo = require('../../repositories/weaponRepository');
const weaponLossRepo = require('../../repositories/weaponLossRepository');
const officialWeaponRepo = require('../../repositories/officialWeaponRepository');
const shiftRepo = require('../../repositories/shiftRepository');
const userRepo = require('../../repositories/userRepository');
const { formatTimestamp } = require('../../utils/time');
const { COLOR } = require('../../utils/embeds');
const { canManageShift, isAdmin, isSupervisor } = require('../../utils/permissions');
const guildConfigRepo = require('../../repositories/guildConfigRepository');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('arma')
        .setDescription('Gerenciamento de armamentos')
        .addSubcommand(sub =>
            sub.setName('consultar')
                .setDescription('Consulta o status e histórico de uma arma')
                .addStringOption(opt =>
                    opt.setName('serie')
                        .setDescription('Número de série da arma')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('registrar')
                .setDescription('Registra uma arma no seu arsenal pessoal')
                .addStringOption(opt =>
                    opt.setName('nome')
                        .setDescription('Nome/tipo da arma (ex: Glock 17, AR-15)')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('serie')
                        .setDescription('Número de série da arma')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('extravio')
                .setDescription('Registra o extravio de uma arma fora de um turno ativo')
                .addStringOption(opt =>
                    opt.setName('serie')
                        .setDescription('Número de série da arma extraviada')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('observacao')
                        .setDescription('Observação sobre o extravio')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('arsenal')
                .setDescription('Lista todas as armas do seu arsenal pessoal')
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        // ── /arma consultar ────────────────────────────────────────
        if (sub === 'consultar') {
            const serial = interaction.options.getString('serie').trim();
            const weapon = await weaponRepo.findBySerial(serial, guildId);

            if (!weapon) {
                return interaction.editReply({
                    content: `Arma \`${serial}\` não encontrada nos registros deste servidor.`,
                });
            }

            const losses = await weaponLossRepo.findBySerial(serial, guildId);
            const official = await officialWeaponRepo.findBySerial(guildId, serial);

            const statusLabel = {
                available: '🟢 Disponível',
                in_use: '🔵 Em Uso',
                lost: '🔴 Extraviada',
            };

            const embed = new EmbedBuilder()
                .setColor(weapon.status === 'lost' ? COLOR.LOSS : COLOR.INFO)
                .setTitle(`🔫 Arma — \`${serial}\``)
                .addFields(
                    { name: '📛 Nome', value: official?.weapon_name || 'Não cadastrada no arsenal', inline: true },
                    { name: '📊 Status', value: statusLabel[weapon.status] || weapon.status, inline: true },
                    {
                        name: '👮 Último Oficial',
                        value: weapon.last_user_name ? `${weapon.last_user_name} (<@${weapon.last_discord_id}>)` : 'N/A',
                        inline: true,
                    },
                    { name: '📟 Último Callsign', value: weapon.last_callsign || 'N/A', inline: true },
                    {
                        name: '🕐 Último Turno',
                        value: weapon.last_shift_started ? formatTimestamp(weapon.last_shift_started) : 'N/A',
                        inline: true,
                    },
                    {
                        name: `⚠️ Histórico de Extravios (${losses.length})`,
                        value: losses.length > 0
                            ? losses.slice(0, 5).map(l =>
                                `${formatTimestamp(l.reported_at)} — ${l.display_name} (${l.callsign}) — ${l.observation || 'sem obs.'}`
                            ).join('\n')
                            : 'Nenhum extravio registrado',
                        inline: false,
                    },
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── /arma registrar ────────────────────────────────────────
        if (sub === 'registrar') {
            const weaponName = interaction.options.getString('nome').trim();
            const serial = interaction.options.getString('serie').trim();

            const dbUser = await userRepo.upsert(
                interaction.user.id,
                interaction.user.username,
                interaction.member.displayName
            );

            await officialWeaponRepo.register(dbUser.id, guildId, weaponName, serial);
            await weaponRepo.upsert(serial, guildId);

            const weaponChannelId = await guildConfigRepo.get(guildId, 'weapon_report_channel_id');
            const reportChannel = interaction.guild.channels.cache.get(weaponChannelId);
            if (reportChannel) {
                const embed = new EmbedBuilder()
                    .setColor(COLOR.INFO)
                    .setTitle('🔫 Nova Arma Registrada no Arsenal')
                    .addFields(
                        { name: '👮 Oficial', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '📛 Nome', value: weaponName, inline: true },
                        { name: '🔢 Série', value: `\`${serial}\``, inline: true },
                        { name: '🕐 Registrada em', value: formatTimestamp(new Date()), inline: true },
                    )
                    .setTimestamp();
                await reportChannel.send({ embeds: [embed] });
            }

            return interaction.editReply({
                content: `✅ Arma **${weaponName}** (\`${serial}\`) registrada no seu arsenal.\nEla será carregada automaticamente ao iniciar um turno.`,
            });
        }

        // ── /arma arsenal ──────────────────────────────────────────
        if (sub === 'arsenal') {
            const dbUser = await userRepo.findByDiscordId(interaction.user.id);
            // Exibe apenas armas ativas — extraviadas são responsabilidade da supervisão
            const weapons = dbUser
                ? await officialWeaponRepo.findByUser(dbUser.id, guildId, { excludeLost: true })
                : [];

            if (weapons.length === 0) {
                return interaction.editReply({
                    content: 'Você não possui armas ativas no arsenal. Use `/arma registrar` para adicionar.',
                });
            }

            const statusLabel = { available: '🟢 Disponível', in_use: '🔵 Em Uso' };

            const embed = new EmbedBuilder()
                .setColor(COLOR.INFO)
                .setTitle(`🗄️ Arsenal — ${interaction.member.displayName}`)
                .setDescription(
                    weapons.map(w =>
                        `${statusLabel[w.status] ?? '⚪'} **${w.weapon_name}** — \`${w.serial_number}\``
                    ).join('\n')
                )
                .setFooter({ text: `${weapons.length} arma(s) ativa(s)` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── /arma extravio ─────────────────────────────────────────
        if (sub === 'extravio') {
            const serial = interaction.options.getString('serie').trim();
            const observation = interaction.options.getString('observacao')?.trim() || null;

            const canAct = isAdmin(interaction.member) || await isSupervisor(interaction.member);
            const dbUser = await userRepo.findByDiscordId(interaction.user.id);

            // Verifica se a arma pertence ao oficial (ou se é admin/supervisor)
            let targetUser = dbUser;
            if (dbUser) {
                const ownWeapon = await officialWeaponRepo.findBySerial(guildId, serial);
                if (!ownWeapon) {
                    if (!canAct) {
                        return interaction.editReply({ content: `❌ A arma \`${serial}\` não está cadastrada no arsenal deste servidor.` });
                    }
                } else if (ownWeapon.discord_id !== interaction.user.id && !canAct) {
                    return interaction.editReply({ content: `❌ Você só pode registrar extravio das suas próprias armas.` });
                }
            }

            // Verifica se há turno ativo — se sim, usa o fluxo normal de turno
            const activeShift = dbUser ? await shiftRepo.findActiveByUser(dbUser.id, guildId) : null;
            if (activeShift) {
                return interaction.editReply({
                    content: `⚠️ Você possui um turno ativo. Use o botão **Arma Perdida** na embed do turno para registrar extravios durante o serviço.`,
                });
            }

            await weaponRepo.upsert(serial, guildId);
            await weaponRepo.setLost(serial, guildId);

            const weaponChannelId = await guildConfigRepo.get(guildId, 'weapon_report_channel_id');
            const reportChannel = interaction.guild.channels.cache.get(weaponChannelId);
            if (reportChannel) {
                const officialWeapon = await officialWeaponRepo.findBySerial(guildId, serial);
                const embed = new EmbedBuilder()
                    .setColor(COLOR.LOSS)
                    .setTitle('🚨 Extravio de Armamento (Fora de Turno)')
                    .addFields(
                        { name: '👮 Oficial', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '📛 Nome', value: officialWeapon?.weapon_name || 'Não cadastrada', inline: true },
                        { name: '🔢 Série', value: `\`${serial}\``, inline: true },
                        { name: '🕐 Horário', value: formatTimestamp(new Date()), inline: true },
                        { name: '📝 Observação', value: observation || 'Sem observação', inline: false },
                    )
                    .setTimestamp();
                await reportChannel.send({ embeds: [embed] });
            }

            return interaction.editReply({
                content: `⚠️ Extravio da arma \`${serial}\` registrado e relatório enviado.`,
            });
        }
    },
};
