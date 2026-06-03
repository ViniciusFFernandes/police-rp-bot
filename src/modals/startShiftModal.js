const { ActionRowBuilder, UserSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { requireConfig } = require('../utils/configGuard');
const pendingComposition = require('../utils/pendingComposition');
const logger = require('../utils/logger');

// Após informar Distrito/Unidade/Callsign, o oficial monta a composição da
// unidade: ele é o responsável (líder) e pode selecionar oficiais adicionais.
// O turno só é criado ao confirmar (botões "Iniciar Turno" / "Apenas eu").
module.exports = {
    customId: 'modal:start_shift',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const cfg = await requireConfig(interaction);
        if (!cfg) return;

        // Remove ':' para não quebrar o parsing dos customId das componentes
        const clean = (v) => v.replace(/:/g, '').trim();
        const district = clean(interaction.fields.getTextInputValue('district')).toUpperCase();
        const unit     = clean(interaction.fields.getTextInputValue('unit')).toUpperCase();
        const callsign = clean(interaction.fields.getTextInputValue('callsign'));

        const fullCallsign  = `${district}-${unit}-${callsign}`;
        const vehiclePrefix = `${district}${callsign}`;

        // Limpa qualquer seleção pendente anterior deste ator
        pendingComposition.clear(interaction.guildId, interaction.user.id);

        const suffix = `${fullCallsign}:${vehiclePrefix}`;

        const memberSelect = new UserSelectMenuBuilder()
            .setCustomId(`shiftcompose:members:${suffix}`)
            .setPlaceholder('Oficiais adicionais da unidade (opcional)')
            .setMinValues(0)
            .setMaxValues(5);

        const confirmBtn = new ButtonBuilder()
            .setCustomId(`shiftcompose:confirm:${suffix}`)
            .setLabel('Iniciar Turno')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

        const soloBtn = new ButtonBuilder()
            .setCustomId(`shiftcompose:solo:${suffix}`)
            .setLabel('Apenas eu')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👤');

        try {
            await interaction.editReply({
                content:
                    `🚔 **Montagem da Unidade Operacional**\n` +
                    `Callsign: **${fullCallsign}** · Viatura: **${vehiclePrefix}**\n\n` +
                    `Você será o **responsável** (motorista/líder).\n` +
                    `Selecione os **oficiais adicionais** abaixo (opcional) e clique em **Iniciar Turno**, ` +
                    `ou em **Apenas eu** para iniciar uma unidade individual.`,
                components: [
                    new ActionRowBuilder().addComponents(memberSelect),
                    new ActionRowBuilder().addComponents(confirmBtn, soloBtn),
                ],
            });
        } catch (err) {
            logger.error('Erro ao montar composição da unidade', { guild: interaction.guildId, error: err.message });
            await interaction.editReply({ content: '❌ Ocorreu um erro ao montar a unidade. Tente novamente.' });
        }
    },
};
