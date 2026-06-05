const {
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    EmbedBuilder,
} = require('discord.js');
const userRepo            = require('../repositories/userRepository');
const officialProfileRepo = require('../repositories/officialProfileRepository');
const officialWeaponRepo  = require('../repositories/officialWeaponRepository');
const weaponRepo          = require('../repositories/weaponRepository');
const shiftRepo           = require('../repositories/shiftRepository');
const guildConfigRepo     = require('../repositories/guildConfigRepository');
const { isSupervisor, isAdmin } = require('../utils/permissions');
const { formatTimestamp } = require('../utils/time');
const { COLOR }           = require('../utils/embeds');
const logger              = require('../utils/logger');

module.exports = {
    customId: 'panel',

    async execute(interaction) {
        const [, action] = interaction.customId.split(':');

        try {
            if (action === 'weapon_register') {
                const modal = new ModalBuilder()
                    .setCustomId('modal:panel_weapon_register')
                    .setTitle('Registrar Arma no Arsenal');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('weapon_name')
                            .setLabel('Nome / Tipo da Arma')
                            .setPlaceholder('ex: Glock 17, AR-15')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(100)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('serial_number')
                            .setLabel('Número de Série')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(50)
                    ),
                );
                return interaction.showModal(modal);
            }

            if (action === 'weapon_loss') {
                // Supervisores/admins informam o número de série manualmente
                if (isAdmin(interaction.member) || await isSupervisor(interaction.member)) {
                    const modal = new ModalBuilder()
                        .setCustomId('modal:panel_weapon_loss')
                        .setTitle('Registrar Extravio de Arma');

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('serial_number')
                                .setLabel('Número de Série da Arma')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setMaxLength(50)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('observation')
                                .setLabel('Observação (opcional)')
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(false)
                                .setMaxLength(300)
                        ),
                    );
                    return interaction.showModal(modal);
                }

                // Oficial comum: exibe select menu com suas próprias armas ativas
                await interaction.deferReply({ ephemeral: true });

                const dbUser  = await userRepo.findByDiscordId(interaction.user.id);
                const weapons = dbUser
                    ? await officialWeaponRepo.findByUser(dbUser.id, interaction.guildId, { excludeLost: true })
                    : [];

                if (weapons.length === 0) {
                    return interaction.editReply({
                        content: '⚠️ Você não possui armas ativas no arsenal para extraviar.',
                    });
                }

                const select = new StringSelectMenuBuilder()
                    .setCustomId('panel:weapon_loss_select')
                    .setPlaceholder('Selecione a arma extraviada')
                    .addOptions(
                        weapons.map(w => ({
                            label: w.weapon_name.slice(0, 100),
                            description: `Série: ${w.serial_number}`,
                            value: w.serial_number,
                        }))
                    );

                return interaction.editReply({
                    content: '⚠️ Selecione a arma extraviada:',
                    components: [new ActionRowBuilder().addComponents(select)],
                });
            }

            if (action === 'weapon_loss_select') {
                await interaction.deferUpdate();

                const serial  = interaction.values[0];
                const guildId = interaction.guildId;

                const dbUser = await userRepo.findByDiscordId(interaction.user.id);

                const activeShift = dbUser
                    ? await shiftRepo.findActiveByParticipant(dbUser.id, guildId)
                    : null;
                if (activeShift) {
                    return interaction.editReply({
                        content: '⚠️ Você está em uma unidade ativa. Use o botão **Arma Perdida** na embed do turno.',
                        components: [],
                    });
                }

                const ownWeapon = await officialWeaponRepo.findBySerial(guildId, serial);
                if (!ownWeapon || ownWeapon.discord_id !== interaction.user.id) {
                    return interaction.editReply({
                        content: `❌ Arma \`${serial}\` não encontrada no seu arsenal.`,
                        components: [],
                    });
                }

                await weaponRepo.upsert(serial, guildId);
                await weaponRepo.setLost(serial, guildId);

                const weaponChannelId = await guildConfigRepo.get(guildId, 'weapon_report_channel_id');
                const reportChannel   = interaction.guild.channels.cache.get(weaponChannelId);
                if (reportChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(COLOR.LOSS)
                        .setTitle('🚨 Extravio de Armamento (Fora de Turno)')
                        .addFields(
                            { name: '👮 Oficial',   value: `<@${interaction.user.id}>`,             inline: true },
                            { name: '📛 Nome',       value: ownWeapon.weapon_name || 'Não cadastrada', inline: true },
                            { name: '🔢 Série',      value: `\`${serial}\``,                          inline: true },
                            { name: '🕐 Horário',    value: formatTimestamp(new Date()),               inline: true },
                            { name: '📝 Observação', value: 'Sem observação',                          inline: false },
                        )
                        .setTimestamp();
                    await reportChannel.send({ embeds: [embed] });
                }

                return interaction.editReply({
                    content: `⚠️ Extravio da arma **${ownWeapon.weapon_name}** (\`${serial}\`) registrado e relatório enviado.`,
                    components: [],
                });
            }

            if (action === 'weapon_arsenal') {
                await interaction.deferReply({ ephemeral: true });

                const dbUser  = await userRepo.findByDiscordId(interaction.user.id);
                const weapons = dbUser
                    ? await officialWeaponRepo.findByUser(dbUser.id, interaction.guildId, { excludeLost: true })
                    : [];

                if (weapons.length === 0) {
                    return interaction.editReply({
                        content: 'Você não possui armas ativas no arsenal. Use o botão **Registrar Arma** para adicionar.',
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

            if (action === 'profile_view') {
                await interaction.deferReply({ ephemeral: true });

                const profile = await officialProfileRepo.findByDiscordId(
                    interaction.user.id,
                    interaction.guildId
                );

                if (!profile) {
                    return interaction.editReply({
                        content: '⚠️ Você ainda não possui perfil configurado. Solicite a um supervisor.',
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor(COLOR.INFO)
                    .setTitle(`👮 Perfil Operacional — ${interaction.member.displayName}`)
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .addFields(
                        { name: '📍 Distrito',   value: profile.district,     inline: true },
                        { name: '📟 Callsign',   value: profile.callsign_num.padStart(3, '0'), inline: true },
                        { name: '🪪 Distintivo', value: profile.badge_num ? profile.badge_num.padStart(4, '0') : '—', inline: true },
                        { name: '👤 Nome',       value: profile.display_name || '—', inline: true },
                        { name: '🕐 Atualizado', value: formatTimestamp(profile.updated_at), inline: true },
                    )
                    .setFooter({ text: interaction.guild.name })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }
        } catch (err) {
            logger.error('Erro no painel operacional', { action, guild: interaction.guildId, error: err.message });
            const reply = { content: '❌ Ocorreu um erro. Tente novamente.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};
