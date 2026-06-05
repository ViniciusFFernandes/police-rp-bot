// Modal handler: ia_description — salva descrição e abre etapa de provas
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const pendingIA = require('../utils/pendingIA');

module.exports = {
    customId: 'ia_description',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const pending = pendingIA.get(interaction.guildId, interaction.user.id);
        if (!pending?.origin || !pending?.involvedDiscordId) {
            return interaction.editReply({ content: '❌ Sessão expirada. Inicie novamente com `/ia abrir`.' });
        }

        const description = interaction.fields.getTextInputValue('description').trim();
        pendingIA.setStep2(interaction.guildId, interaction.user.id, { description, evidence: null });

        return interaction.editReply({
            content:
                '📋 **Descrição registrada!**\n\n' +
                'Deseja adicionar provas (imagens, arquivos ou links)?\n' +
                'Se sim, clique em **Adicionar Provas** — o bot abrirá uma área no canal de IA para você enviar os arquivos.',
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ia:evidence_add')
                        .setLabel('Adicionar Provas')
                        .setEmoji('📎')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('ia:evidence_skip')
                        .setLabel('Pular, criar sem provas')
                        .setStyle(ButtonStyle.Secondary),
                ),
            ],
        });
    },
};
