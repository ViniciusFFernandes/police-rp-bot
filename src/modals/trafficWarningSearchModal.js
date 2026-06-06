const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const trafficWarningRepo = require('../repositories/trafficWarningRepository');
const { COLOR } = require('../utils/embeds');
const { formatTimestamp } = require('../utils/time');
const logger = require('../utils/logger');

const customId = 'modal:traffic_warning_search';

function build() {
    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle('Consultar Advertências de Trânsito')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('citizen_id')
                    .setLabel('CitizenID (opcional)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(50)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('plate')
                    .setLabel('Placa — completa ou parcial (opcional)')
                    .setPlaceholder('ex: ABC1234 ou apenas 1234')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(20)
            ),
        );
}

module.exports = {
    customId,
    build,
    async execute(interaction) {
        const citizenId = interaction.fields.getTextInputValue('citizen_id').trim();
        const plate     = interaction.fields.getTextInputValue('plate').trim();

        if (!citizenId && !plate) {
            return interaction.reply({
                content: '⚠️ Informe ao menos um filtro: CitizenID e/ou placa.',
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const results = await trafficWarningRepo.search(interaction.guildId, {
                citizenId: citizenId || null,
                plate: plate || null,
            });

            if (results.length === 0) {
                return interaction.editReply({ content: '🔎 Nenhuma advertência encontrada com esses filtros.' });
            }

            const embed = new EmbedBuilder()
                .setColor(COLOR.INFO)
                .setTitle('🔎 Advertências de Trânsito')
                .setDescription(
                    results.map(w =>
                        `**${w.warning_number}** — ${w.condutor_name} (\`${w.citizen_id}\`)\n` +
                        `🚗 Placa: ${w.plate || '—'} • ⏳ Prazo: ${w.deadline || '—'} • 🕐 ${formatTimestamp(w.created_at)}\n` +
                        `⚠️ ${w.infractions}`
                    ).join('\n\n')
                )
                .setFooter({ text: `${results.length} resultado(s)` });

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            logger.error('Erro ao consultar advertências de trânsito', { guild: interaction.guildId, error: err.message });
            return interaction.editReply({ content: '❌ Ocorreu um erro ao consultar as advertências.' });
        }
    },
};
