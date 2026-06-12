const { EmbedBuilder } = require('discord.js');
const { COLOR } = require('../utils/embeds');
const logger = require('../utils/logger');

// Extrai emojis unicode e customizados de um texto
function parseEmojis(raw) {
    if (!raw) return [];
    const matches = raw.match(/<a?:\w+:\d+>|\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu) || [];
    return [...new Set(matches)].slice(0, 20);
}

module.exports = {
    customId: 'modal:owner_comunicado',

    async execute(interaction) {
        const ownerId = process.env.BOT_OWNER_ID;
        if (!ownerId || interaction.user.id !== ownerId) {
            return interaction.reply({ content: '⛔ Acesso negado.', ephemeral: true });
        }

        const titulo    = interaction.fields.getTextInputValue('titulo').trim();
        const mensagem  = interaction.fields.getTextInputValue('mensagem').trim();
        const emojisRaw = interaction.fields.getTextInputValue('emojis').trim();

        await interaction.deferReply({ ephemeral: true });

        try {
            const channel = interaction.channel;

            const embed = new EmbedBuilder()
                .setColor(COLOR.INFO)
                .setTitle(`📢 ${titulo}`)
                .setDescription(mensagem)
                .setTimestamp();

            const message = await channel.send({ embeds: [embed] });

            for (const emoji of parseEmojis(emojisRaw)) {
                try { await message.react(emoji); } catch { /* emoji inválido — ignora */ }
            }

            await channel.send({
                content: '@everyone',
                allowedMentions: { parse: ['everyone'] },
            });

            return interaction.editReply({ content: `✅ Comunicado publicado em ${channel}.` });
        } catch (err) {
            logger.error('Erro ao publicar comunicado do dono', { guild: interaction.guildId, error: err.message });
            return interaction.editReply({ content: '❌ Ocorreu um erro ao publicar o comunicado.' });
        }
    },
};
