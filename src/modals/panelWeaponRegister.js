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

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const weaponName = interaction.fields.getTextInputValue('weapon_name').trim();
        const serial     = interaction.fields.getTextInputValue('serial_number').trim();
        const guildId    = interaction.guildId;

        try {
            const dbUser = await userRepo.upsert(
                interaction.user.id,
                interaction.user.username,
                interaction.member.displayName
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
                        { name: '👮 Oficial',      value: `<@${interaction.user.id}>`, inline: true },
                        { name: '📛 Nome',          value: weaponName,                  inline: true },
                        { name: '🔢 Série',         value: `\`${serial}\``,             inline: true },
                        { name: '🕐 Registrada em', value: formatTimestamp(new Date()), inline: true },
                    )
                    .setTimestamp();
                await reportChannel.send({ embeds: [embed] });
            }

            return interaction.editReply({
                content: `✅ Arma **${weaponName}** (\`${serial}\`) registrada no seu arsenal.\nEla será carregada automaticamente ao iniciar um turno.`,
            });
        } catch (err) {
            logger.error('Erro ao registrar arma pelo painel', { guild: guildId, error: err.message });
            return interaction.editReply({ content: '❌ Ocorreu um erro ao registrar a arma. Tente novamente.' });
        }
    },
};
