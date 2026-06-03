const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const shiftService = require('../services/shiftService');
const { endReasonLabel } = require('../utils/embeds');
const logger = require('../utils/logger');

// Trata a escolha do motivo de encerramento (StringSelectMenu) e dispara o
// encerramento. Para "Remodulação", oferece iniciar imediatamente uma nova unidade.
module.exports = {
    customId: 'shiftend',

    async execute(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1];

        if (action !== 'reason') return;

        const ownerDiscordId = parts[2];
        const reason = interaction.values?.[0];

        try {
            // "Outro" → coletar motivo personalizado opcional via modal
            if (reason === 'other') {
                const modal = new ModalBuilder()
                    .setCustomId(`modal:end_reason:${ownerDiscordId}`)
                    .setTitle('Motivo do Encerramento');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('note')
                            .setLabel('Motivo (opcional)')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(500)
                    ),
                );
                return interaction.showModal(modal);
            }

            await interaction.deferUpdate();

            const result = await shiftService.endShift(interaction, ownerDiscordId, { reason });
            if (result.error) {
                return interaction.editReply({ content: `❌ ${result.error}`, components: [] });
            }

            await interaction.editReply({
                content: `🔴 Turno encerrado — **${endReasonLabel(reason)}**. Bom descanso!`,
                components: [],
            });

            // Fluxo especial de remodulação: oferecer iniciar nova unidade
            if (reason === 'remodulation') {
                await interaction.followUp({
                    content:
                        '🔄 **Remodulação concluída.**\n' +
                        'O relatório foi gerado e o canal de voz encerrado.\n' +
                        'Deseja iniciar uma nova unidade agora?',
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('shiftcompose:new')
                                .setLabel('Iniciar Nova Unidade')
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('🚔'),
                            new ButtonBuilder()
                                .setCustomId('shiftcompose:cancel')
                                .setLabel('Não, obrigado')
                                .setStyle(ButtonStyle.Secondary),
                        ),
                    ],
                    ephemeral: true,
                });
            }
        } catch (err) {
            logger.error('Erro ao encerrar turno com motivo', { reason, guild: interaction.guildId, error: err.message });
            const reply = { content: '❌ Erro ao encerrar o turno.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};
