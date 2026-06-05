const { EmbedBuilder } = require('discord.js');
const userRepo           = require('../repositories/userRepository');
const officialWeaponRepo = require('../repositories/officialWeaponRepository');
const weaponRepo         = require('../repositories/weaponRepository');
const guildConfigRepo    = require('../repositories/guildConfigRepository');
const { formatTimestamp } = require('../utils/time');
const { COLOR }          = require('../utils/embeds');
const logger             = require('../utils/logger');

module.exports = {
    customId: 'modal:panel_weapon_register',

    matches(id) {
        return id === 'modal:panel_weapon_register' || id.startsWith('modal:panel_weapon_register:');
    },

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const weaponName = interaction.fields.getTextInputValue('weapon_name').trim();
        const serial     = interaction.fields.getTextInputValue('serial_number').trim();
        const guildId    = interaction.guildId;

        // Supervisor registrando para outro oficial: targetId vem no customId
        const parts    = interaction.customId.split(':');
        const targetId = parts[2] ?? interaction.user.id;
        const isForOther = targetId !== interaction.user.id;

        try {
            let targetMember = null;
            let targetUser   = null;

            if (isForOther) {
                targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
                targetUser   = targetMember?.user ?? await interaction.client.users.fetch(targetId).catch(() => null);
                if (!targetUser) {
                    return interaction.editReply({ content: '❌ Não foi possível encontrar o oficial informado.' });
                }
            } else {
                targetUser   = interaction.user;
                targetMember = interaction.member;
            }

            const dbUser = await userRepo.upsert(
                targetUser.id,
                targetUser.username,
                targetMember?.displayName ?? targetUser.username,
            );

            await officialWeaponRepo.register(dbUser.id, guildId, weaponName, serial);
            await weaponRepo.upsert(serial, guildId);

            const weaponChannelId = await guildConfigRepo.get(guildId, 'weapon_report_channel_id');
            const reportChannel   = interaction.guild.channels.cache.get(weaponChannelId);
            if (reportChannel) {
                const embed = new EmbedBuilder()
                    .setColor(COLOR.INFO)
                    .setTitle('🔫 Nova Arma Registrada no Arsenal')
                    .addFields(
                        { name: '👮 Oficial',        value: `<@${targetUser.id}>`,         inline: true },
                        { name: '📛 Nome',            value: weaponName,                     inline: true },
                        { name: '🔢 Série',           value: `\`${serial}\``,               inline: true },
                        { name: '🕐 Registrada em',   value: formatTimestamp(new Date()),    inline: true },
                        ...(isForOther ? [{ name: '🔰 Registrado por', value: `<@${interaction.user.id}>`, inline: true }] : []),
                    )
                    .setTimestamp();
                await reportChannel.send({ embeds: [embed] });
            }

            const target = isForOther ? `<@${targetUser.id}>` : 'seu';
            return interaction.editReply({
                content: `✅ Arma **${weaponName}** (\`${serial}\`) registrada no arsenal de ${target}.\nEla será carregada automaticamente ao iniciar um turno.`,
            });
        } catch (err) {
            logger.error('Erro ao registrar arma pelo painel', { guild: guildId, error: err.message });
            return interaction.editReply({ content: '❌ Ocorreu um erro ao registrar a arma. Tente novamente.' });
        }
    },
};
