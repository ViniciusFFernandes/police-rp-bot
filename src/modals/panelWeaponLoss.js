const { EmbedBuilder } = require('discord.js');
const userRepo           = require('../repositories/userRepository');
const officialWeaponRepo = require('../repositories/officialWeaponRepository');
const weaponRepo         = require('../repositories/weaponRepository');
const shiftRepo          = require('../repositories/shiftRepository');
const guildConfigRepo    = require('../repositories/guildConfigRepository');
const { formatTimestamp } = require('../utils/time');
const { COLOR }          = require('../utils/embeds');
const logger             = require('../utils/logger');

module.exports = {
    customId: 'modal:panel_weapon_loss',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const serial      = interaction.fields.getTextInputValue('serial_number').trim();
        const observation = interaction.fields.getTextInputValue('observation')?.trim() || null;
        const guildId     = interaction.guildId;

        try {
            const dbUser = await userRepo.findByDiscordId(interaction.user.id);

            // Bloqueia se estiver em turno ativo — deve usar o botão da embed do turno
            const activeShift = dbUser
                ? await shiftRepo.findActiveByParticipant(dbUser.id, guildId)
                : null;
            if (activeShift) {
                return interaction.editReply({
                    content: '⚠️ Você está em uma unidade ativa. Use o botão **Arma Perdida** na embed do turno para registrar extravios durante o serviço.',
                });
            }

            // Verifica se a arma pertence ao oficial
            const ownWeapon = await officialWeaponRepo.findBySerial(guildId, serial);
            if (!ownWeapon) {
                return interaction.editReply({ content: `❌ A arma \`${serial}\` não está cadastrada no arsenal deste servidor.` });
            }
            if (ownWeapon.discord_id !== interaction.user.id) {
                return interaction.editReply({ content: `❌ Você só pode registrar extravio das suas próprias armas.` });
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
                        { name: '👮 Oficial',    value: `<@${interaction.user.id}>`,    inline: true },
                        { name: '📛 Nome',        value: ownWeapon.weapon_name || 'Não cadastrada', inline: true },
                        { name: '🔢 Série',       value: `\`${serial}\``,                inline: true },
                        { name: '🕐 Horário',     value: formatTimestamp(new Date()),    inline: true },
                        { name: '📝 Observação',  value: observation || 'Sem observação', inline: false },
                    )
                    .setTimestamp();
                await reportChannel.send({ embeds: [embed] });
            }

            return interaction.editReply({
                content: `⚠️ Extravio da arma \`${serial}\` registrado e relatório enviado.`,
            });
        } catch (err) {
            logger.error('Erro ao registrar extravio pelo painel', { guild: guildId, error: err.message });
            return interaction.editReply({ content: '❌ Ocorreu um erro ao registrar o extravio. Tente novamente.' });
        }
    },
};
