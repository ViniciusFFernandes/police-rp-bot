const {
    SlashCommandBuilder,
    EmbedBuilder,
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('comunicado')
        .setDescription('Publica um comunicado no canal atual (apenas dono do bot)'),

    async execute(interaction) {
        const ownerId = process.env.BOT_OWNER_ID;
        if (!ownerId || interaction.user.id !== ownerId) {
            return interaction.reply({
                content: '⛔ Apenas o dono do bot pode usar este comando.',
                ephemeral: true,
            });
        }

        const modal = new ModalBuilder()
            .setCustomId('modal:owner_comunicado')
            .setTitle('Comunicado');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('titulo')
                    .setLabel('Título')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(150)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('mensagem')
                    .setLabel('Mensagem')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(3500)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('emojis')
                    .setLabel('Emojis para reação (separados por espaço)')
                    .setPlaceholder('ex: ✅ 👍')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(100)
            ),
        );

        return interaction.showModal(modal);
    },
};
