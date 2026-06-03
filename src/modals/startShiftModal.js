const { ActionRowBuilder, UserSelectMenuBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { requireConfig } = require('../utils/configGuard');
const vehicleRepo = require('../repositories/vehicleRepository');
const unitRepo    = require('../repositories/unitRepository');
const pendingComposition = require('../utils/pendingComposition');
const logger = require('../utils/logger');

module.exports = {
    customId: 'modal:start_shift',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const cfg = await requireConfig(interaction);
        if (!cfg) return;

        const clean = (v) => v.replace(/:/g, '').trim();
        const district    = clean(interaction.fields.getTextInputValue('district')).toUpperCase();
        const callsignNum = clean(interaction.fields.getTextInputValue('callsign'));

        // Salva a base na composição pendente; limpa seleções anteriores
        pendingComposition.setBase(interaction.guildId, interaction.user.id, district, callsignNum);

        const [units, vehicles] = await Promise.all([
            unitRepo.findActive(interaction.guildId),
            vehicleRepo.findActive(interaction.guildId),
        ]);

        const hasUnits = units.length > 0;
        const components = [];

        // ── Seletor de Unidade ──────────────────────────────────────
        if (hasUnits) {
            const unitSelect = new StringSelectMenuBuilder()
                .setCustomId('shiftcompose:unit')
                .setPlaceholder('Selecione a unidade (ex: A, L, K...)')
                .addOptions(units.map(u => ({ label: u.name, value: u.name })));
            components.push(new ActionRowBuilder().addComponents(unitSelect));
        }

        // ── Seletor de Viatura ──────────────────────────────────────
        if (vehicles.length > 0) {
            const vehicleSelect = new StringSelectMenuBuilder()
                .setCustomId('shiftcompose:vehicle')
                .setPlaceholder('Selecione a viatura')
                .addOptions(vehicles.map(v => ({ label: v.name, value: v.name })));
            components.push(new ActionRowBuilder().addComponents(vehicleSelect));
        }

        // ── Seletor de Membros ──────────────────────────────────────
        const memberSelect = new UserSelectMenuBuilder()
            .setCustomId('shiftcompose:members')
            .setPlaceholder('Oficiais adicionais da unidade (opcional)')
            .setMinValues(0)
            .setMaxValues(5);
        components.push(new ActionRowBuilder().addComponents(memberSelect));

        // ── Botões de confirmação ───────────────────────────────────
        const confirmBtn = new ButtonBuilder()
            .setCustomId('shiftcompose:confirm')
            .setLabel('Iniciar Turno')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
            .setDisabled(hasUnits); // desabilitado até selecionar unidade

        const soloBtn = new ButtonBuilder()
            .setCustomId('shiftcompose:solo')
            .setLabel('Apenas eu')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👤')
            .setDisabled(hasUnits); // desabilitado até selecionar unidade

        components.push(new ActionRowBuilder().addComponents(confirmBtn, soloBtn));

        // Monta a linha de dicas
        const notes = [];
        if (hasUnits)           notes.push('Selecione a **unidade**.');
        else                    notes.push('⚠️ Nenhuma unidade cadastrada — use `/unidade registrar`.');
        if (vehicles.length > 0) notes.push('Selecione a **viatura** (opcional).');
        else                    notes.push('💡 Sem viaturas cadastradas — use `/veiculo registrar`.');
        notes.push('Selecione **oficiais adicionais** (opcional).');

        const previewCallsign = hasUnits
            ? `${district}-<unidade>-${callsignNum}`
            : `${district}-???-${callsignNum}`;

        try {
            await interaction.editReply({
                content:
                    `🚔 **Montagem da Unidade Operacional**\n` +
                    `Distrito: **${district}** · Callsign: **${callsignNum}** → \`${previewCallsign}\`\n\n` +
                    `Você será o **responsável** (motorista/líder).\n` +
                    notes.join('\n'),
                components,
            });
        } catch (err) {
            logger.error('Erro ao montar composição da unidade', { guild: interaction.guildId, error: err.message });
            await interaction.editReply({ content: '❌ Ocorreu um erro. Tente novamente.' });
        }
    },
};
