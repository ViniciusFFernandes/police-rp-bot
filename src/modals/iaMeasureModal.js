const { EmbedBuilder } = require('discord.js');
const pendingMeasure  = require('../utils/pendingMeasure');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { COLOR }       = require('../utils/embeds');
const { formatTimestamp } = require('../utils/time');
const logger          = require('../utils/logger');

const TYPE_LABEL = {
    punishment: '⚠️ Punição',
    suspension:  '🚫 Afastamento',
    other:       '📋 Outra Medida',
};

module.exports = {
    customId: 'modal:iapanel_measure',

    matches(id) { return id.startsWith('modal:iapanel_measure:'); },

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetId  = interaction.customId.split(':')[2];
        const guildId   = interaction.guildId;
        const pending   = pendingMeasure.get(guildId, interaction.user.id);

        if (!pending?.type || !pending?.targetId) {
            return interaction.editReply({ content: '❌ Sessão expirada. Inicie novamente pelo painel de Assuntos Internos.' });
        }

        const duration    = interaction.fields.getTextInputValue('duration')?.trim() || null;
        const description = interaction.fields.getTextInputValue('description').trim();
        pendingMeasure.clear(guildId, interaction.user.id);

        try {
            const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
            const targetUser   = targetMember?.user ?? await interaction.client.users.fetch(targetId).catch(() => null);
            const targetName   = targetMember?.displayName ?? targetUser?.username ?? targetId;

            const channelId    = await guildConfigRepo.get(guildId, 'ia_measures_channel_id');
            const alertChannel = channelId ? interaction.guild.channels.cache.get(channelId) : null;

            const fields = [
                { name: '👮 Oficial',     value: `<@${targetId}>`,                    inline: true },
                { name: '⚖️ Tipo',        value: TYPE_LABEL[pending.type] ?? pending.type, inline: true },
                { name: '🔰 Aplicado por', value: `<@${interaction.user.id}>`,         inline: true },
            ];

            if (pending.type === 'suspension' && duration) {
                fields.push({ name: '⏱️ Duração', value: duration, inline: true });
            } else if (duration) {
                fields.push({ name: '⏱️ Duração / Prazo', value: duration, inline: true });
            }

            fields.push({ name: '🔫 Entrega de Armamento', value: pending.weaponSurrender === 'yes' ? '✅ Sim — oficial deve entregar armamento' : '❌ Não necessário', inline: false });
            fields.push({ name: '📝 Descrição / Motivo', value: description, inline: false });
            fields.push({ name: '🕐 Data/Hora', value: formatTimestamp(new Date()), inline: true });

            const embed = new EmbedBuilder()
                .setColor(pending.type === 'suspension' ? COLOR.LOSS : COLOR.PAUSED)
                .setTitle(`⚖️ Medida Disciplinar — ${targetName}`)
                .addFields(fields)
                .setFooter({ text: interaction.guild.name })
                .setTimestamp();

            if (alertChannel) {
                await alertChannel.send({ embeds: [embed] });
            }

            const weaponNote = pending.weaponSurrender === 'yes'
                ? '\n⚠️ O oficial deve **entregar seu armamento** à equipe de Assuntos Internos.'
                : '';

            return interaction.editReply({
                content:
                    `✅ Medida **${TYPE_LABEL[pending.type]}** aplicada a <@${targetId}>.${weaponNote}` +
                    (alertChannel ? '' : '\n⚠️ Canal de alertas não configurado — use `/configurar canal-medidas-ia`.'),
            });
        } catch (err) {
            logger.error('Erro ao registrar medida disciplinar', { guild: guildId, error: err.message });
            return interaction.editReply({ content: '❌ Ocorreu um erro ao registrar a medida. Tente novamente.' });
        }
    },
};
