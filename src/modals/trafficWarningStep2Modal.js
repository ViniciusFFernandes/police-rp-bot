const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const pendingTrafficWarning  = require('../utils/pendingTrafficWarning');
const trafficWarningRepo     = require('../repositories/trafficWarningRepository');
const trafficWarningService  = require('../services/trafficWarningService');
const { COLOR } = require('../utils/embeds');
const logger = require('../utils/logger');

const customId = 'modal:traffic_warning_step2';

function build() {
    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle('Advertência de Trânsito — Etapa 2/2')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('infractions')
                    .setLabel('Infrações cometidas')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(500)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('description')
                    .setLabel('Descrição do ocorrido (opcional)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setMaxLength(1000)
            ),
        );
}

module.exports = {
    customId,
    build,
    async execute(interaction) {
        const pending = pendingTrafficWarning.get(interaction.guildId, interaction.user.id);
        if (!pending || !pending.condutorName || !pending.citizenId) {
            return interaction.reply({
                content: '⚠️ Sessão expirada. Use o botão **Registrar Advertência** novamente.',
                ephemeral: true,
            });
        }

        const infractions = interaction.fields.getTextInputValue('infractions').trim();
        const description  = interaction.fields.getTextInputValue('description').trim();

        await interaction.deferReply({ ephemeral: true });

        try {
            const warningNumber = await trafficWarningRepo.nextWarningNumber(interaction.guildId);
            const warning = await trafficWarningRepo.create({
                guildId: interaction.guildId,
                warningNumber,
                condutorName: pending.condutorName,
                citizenId: pending.citizenId,
                plate: pending.plate,
                deadline: pending.deadline,
                infractions,
                description: description || null,
                registeredByDiscordId: interaction.user.id,
            });

            pendingTrafficWarning.clear(interaction.guildId, interaction.user.id);

            await trafficWarningService.postNotification(interaction.guild, warning);

            const embed = new EmbedBuilder()
                .setColor(COLOR.SUCCESS ?? COLOR.INFO)
                .setTitle(`✅ Advertência ${warning.warning_number} registrada`)
                .addFields(
                    { name: '👤 Condutor',  value: warning.condutor_name, inline: true },
                    { name: '🪪 CitizenID', value: warning.citizen_id,    inline: true },
                    { name: '🚗 Placa',     value: warning.plate || '—',  inline: true },
                );

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            logger.error('Erro ao registrar advertência de trânsito', { guild: interaction.guildId, error: err.message });
            return interaction.editReply({ content: '❌ Ocorreu um erro ao registrar a advertência.' });
        }
    },
};
