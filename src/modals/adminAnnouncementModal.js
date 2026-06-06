const { EmbedBuilder } = require('discord.js');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { COLOR } = require('../utils/embeds');
const logger = require('../utils/logger');

const customId = 'modal:adminpanel_announcement';

// Extrai emojis unicode e emojis customizados (<:nome:id> / <a:nome:id>) de um texto
function parseEmojis(raw) {
    if (!raw) return [];
    const matches = raw.match(/<a?:\w+:\d+>|\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu) || [];
    return [...new Set(matches)].slice(0, 20);
}

module.exports = {
    customId,
    async execute(interaction) {
        const titulo  = interaction.fields.getTextInputValue('titulo').trim();
        const mensagem = interaction.fields.getTextInputValue('mensagem').trim();
        const emojisRaw = interaction.fields.getTextInputValue('emojis').trim();

        await interaction.deferReply({ ephemeral: true });

        try {
            const channelId = await guildConfigRepo.get(interaction.guildId, 'announcements_channel_id');
            if (!channelId) {
                return interaction.editReply({
                    content: '⚠️ Nenhum canal de comunicados configurado. Use `/configurar canal-comunicados`.',
                });
            }

            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) {
                return interaction.editReply({ content: '⚠️ Canal de comunicados configurado não foi encontrado.' });
            }

            const policeRoleIds = await guildConfigRepo.getPoliceRoles(interaction.guildId);
            const mentions = ['@everyone', ...policeRoleIds.map(id => `<@&${id}>`)];

            const embed = new EmbedBuilder()
                .setColor(COLOR.INFO)
                .setTitle(`📢 ${titulo}`)
                .setDescription(mensagem)
                .setFooter({ text: `Comunicado de ${interaction.member.displayName}` })
                .setTimestamp();

            const message = await channel.send({ embeds: [embed] });

            for (const emoji of parseEmojis(emojisRaw)) {
                try { await message.react(emoji); } catch { /* emoji inválido ou inacessível — ignora */ }
            }

            // Envia as menções em uma mensagem separada, após o quadro do aviso
            await channel.send({
                content: mentions.join(' '),
                allowedMentions: { parse: ['everyone'], roles: policeRoleIds },
            });

            return interaction.editReply({ content: `✅ Comunicado publicado em ${channel}.` });
        } catch (err) {
            logger.error('Erro ao publicar comunicado geral', { guild: interaction.guildId, error: err.message });
            return interaction.editReply({ content: '❌ Ocorreu um erro ao publicar o comunicado.' });
        }
    },
};
