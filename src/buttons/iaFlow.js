// Handles buttons during the IA investigation opening flow (steps 1→2→3)
const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { isIAStaff } = require('../utils/permissions');
const pendingIA = require('../utils/pendingIA');
const { COLOR } = require('../utils/embeds');

module.exports = {
    customId: 'ia',

    async execute(interaction) {
        if (!await isIAStaff(interaction.member)) {
            return interaction.reply({ content: '❌ Sem permissão para gerenciar investigações internas.', ephemeral: true });
        }

        const [, action] = interaction.customId.split(':');

        // ── Seleção de origem ────────────────────────────────────────
        if (action === 'origin') {
            const origin = interaction.values[0];
            pendingIA.setStep1(interaction.guildId, interaction.user.id, origin, null);
            return interaction.deferUpdate();
        }

        // ── Seleção do oficial envolvido ─────────────────────────────
        if (action === 'involved') {
            const pending = pendingIA.get(interaction.guildId, interaction.user.id) || {};
            pendingIA.setStep1(interaction.guildId, interaction.user.id, pending.origin, interaction.values[0]);
            return interaction.deferUpdate();
        }

        // ── Etapa 2: abre modal de detalhes do incidente ─────────────
        if (action === 'step2') {
            const pending = pendingIA.get(interaction.guildId, interaction.user.id);

            if (!pending?.origin) {
                return interaction.reply({ content: '❌ Selecione a **origem** da investigação.', ephemeral: true });
            }
            if (!pending?.involvedDiscordId) {
                return interaction.reply({ content: '❌ Selecione o **oficial acusado/envolvido**.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId('ia_details')
                .setTitle('Investigação — Detalhes do Incidente');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('radio_vehicle')
                        .setLabel('Viatura no dia (indicativo de rádio)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ex: Eagle-01, Patriot')
                        .setRequired(false)
                        .setMaxLength(50)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('incident_datetime')
                        .setLabel('Data e Hora do Fato (DD/MM/AAAA HH:MM)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ex: 04/06/2026 14:30')
                        .setRequired(false)
                        .setMaxLength(20)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('incident_location')
                        .setLabel('Local do Incidente')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ex: Cruzamento da Rua das Flores com Av. Brasil')
                        .setRequired(false)
                        .setMaxLength(200)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('classification')
                        .setLabel('Classificação / Motivo')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ex: Uso excessivo de força, Abuso de autoridade')
                        .setRequired(true)
                        .setMaxLength(200)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('complainant_id')
                        .setLabel('Identificação do Reclamante (opcional)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Nome, documento ou @Discord do reclamante')
                        .setRequired(false)
                        .setMaxLength(200)
                ),
            );

            return interaction.showModal(modal);
        }

        // ── Etapa 3: abre modal de descrição e provas ────────────────
        if (action === 'step3') {
            const modal = new ModalBuilder()
                .setCustomId('ia_description')
                .setTitle('Investigação — Descrição e Provas');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('description')
                        .setLabel('Descrição do Ocorrido')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Descreva detalhadamente o que ocorreu...')
                        .setRequired(true)
                        .setMaxLength(2000)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('evidence')
                        .setLabel('Provas/Evidências (links ou descrição)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Cole links de fotos, vídeos ou descreva as provas disponíveis. Separe por vírgula.')
                        .setRequired(false)
                        .setMaxLength(1000)
                ),
            );

            return interaction.showModal(modal);
        }
    },
};
