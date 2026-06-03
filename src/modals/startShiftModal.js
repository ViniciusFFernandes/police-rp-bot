const { ActionRowBuilder, UserSelectMenuBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { requireConfig } = require('../utils/configGuard');
const vehicleRepo = require('../repositories/vehicleRepository');
const pendingComposition = require('../utils/pendingComposition');
const logger = require('../utils/logger');

// Após informar Distrito/Unidade/Callsign o oficial monta a unidade:
//  1. Seleciona o veículo (se houver cadastro)
//  2. Seleciona oficiais adicionais
//  3. Confirma
module.exports = {
    customId: 'modal:start_shift',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const cfg = await requireConfig(interaction);
        if (!cfg) return;

        const clean = (v) => v.replace(/:/g, '').trim();
        const district = clean(interaction.fields.getTextInputValue('district')).toUpperCase();
        const unit     = clean(interaction.fields.getTextInputValue('unit')).toUpperCase();
        const callsign = clean(interaction.fields.getTextInputValue('callsign'));

        const fullCallsign  = `${district}-${unit}-${callsign}`;
        const vehiclePrefix = `${district}${callsign}`;

        pendingComposition.clear(interaction.guildId, interaction.user.id);

        const vehicles = await vehicleRepo.findActive(interaction.guildId);

        // Sufixo que carrega callsign e vehiclePrefix pelos botões/menus seguintes
        const suffix = `${fullCallsign}:${vehiclePrefix}`;

        const components = [];

        // Seletor de viatura (presente apenas quando há viaturas cadastradas)
        if (vehicles.length > 0) {
            const vehicleSelect = new StringSelectMenuBuilder()
                .setCustomId(`shiftcompose:vehicle:${suffix}`)
                .setPlaceholder('Selecione a viatura')
                .addOptions(
                    vehicles.map(v => ({ label: v.name, value: v.name }))
                );
            components.push(new ActionRowBuilder().addComponents(vehicleSelect));
        }

        // Seletor de oficiais adicionais
        const memberSelect = new UserSelectMenuBuilder()
            .setCustomId(`shiftcompose:members:${suffix}`)
            .setPlaceholder('Oficiais adicionais da unidade (opcional)')
            .setMinValues(0)
            .setMaxValues(5);
        components.push(new ActionRowBuilder().addComponents(memberSelect));

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

        components.push(new ActionRowBuilder().addComponents(confirmBtn, soloBtn));

        const vehicleNote = vehicles.length > 0
            ? 'Selecione a **viatura** e os **oficiais adicionais** (opcional).'
            : '⚠️ Nenhuma viatura cadastrada. Use `/veiculo registrar` para adicionar.\nSelecione os **oficiais adicionais** (opcional).';

        try {
            await interaction.editReply({
                content:
                    `🚔 **Montagem da Unidade Operacional**\n` +
                    `Callsign: **${fullCallsign}** · Prefixo: **${vehiclePrefix}**\n\n` +
                    `Você será o **responsável** (motorista/líder).\n${vehicleNote}\n` +
                    `Clique em **Iniciar Turno** para confirmar ou **Apenas eu** para unidade individual.`,
                components,
            });
        } catch (err) {
            logger.error('Erro ao montar composição da unidade', { guild: interaction.guildId, error: err.message });
            await interaction.editReply({ content: '❌ Ocorreu um erro. Tente novamente.' });
        }
    },
};
