const shiftService = require('../services/shiftService');
const pendingComposition = require('../utils/pendingComposition');
const { requireConfig } = require('../utils/configGuard');
const { buildStartShiftModal } = require('../utils/shiftForms');
const logger = require('../utils/logger');

async function startFromComposition(interaction, callsign, vehiclePrefix, additionalDiscordIds, vehicle) {
    await interaction.deferUpdate();

    const cfg = await requireConfig(interaction);
    if (!cfg) return;

    const result = await shiftService.startShift(interaction, cfg, {
        callsign,
        vehiclePrefix,
        additionalDiscordIds,
        vehicle: vehicle || null,
    });

    pendingComposition.clear(interaction.guildId, interaction.user.id);

    if (result.error) {
        return interaction.editReply({ content: `❌ ${result.error}`, components: [] });
    }

    const vehicleInfo = vehicle ? `🚗 Viatura: **${vehicle}**\n` : '';
    const weaponInfo = result.weaponCount > 0
        ? `🔫 **${result.weaponCount} arma(s)** vinculadas automaticamente dos arsenais da equipe.`
        : '⚠️ Nenhuma arma vinculada. Use **Adicionar Arma** ou `/arma registrar`.';

    await interaction.editReply({
        content:
            `✅ **Unidade iniciada!**\n` +
            `Callsign: **${callsign}**\n` +
            vehicleInfo +
            `👥 **${result.memberCount} oficial(is)** na unidade.\n${weaponInfo}`,
        components: [],
    });
}

module.exports = {
    customId: 'shiftcompose',

    async execute(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1];

        try {
            // Seleção de viatura
            if (action === 'vehicle') {
                pendingComposition.setVehicle(interaction.guildId, interaction.user.id, interaction.values[0]);
                return interaction.deferUpdate();
            }

            // Seleção de oficiais adicionais
            if (action === 'members') {
                pendingComposition.setMembers(interaction.guildId, interaction.user.id, interaction.values);
                return interaction.deferUpdate();
            }

            // Confirmar com os adicionais selecionados
            if (action === 'confirm') {
                const [, , callsign, vehiclePrefix] = parts;
                const { memberIds, vehicle } = pendingComposition.get(interaction.guildId, interaction.user.id);
                return startFromComposition(interaction, callsign, vehiclePrefix, memberIds, vehicle);
            }

            // Unidade individual — usa a viatura selecionada (se houver)
            if (action === 'solo') {
                const [, , callsign, vehiclePrefix] = parts;
                const { vehicle } = pendingComposition.get(interaction.guildId, interaction.user.id);
                return startFromComposition(interaction, callsign, vehiclePrefix, [], vehicle);
            }

            // Remodulação — abre nova montagem de unidade
            if (action === 'new') {
                return interaction.showModal(buildStartShiftModal());
            }

            // Remodulação recusada
            if (action === 'cancel') {
                await interaction.deferUpdate();
                return interaction.editReply({ content: '👍 Ok, nenhuma nova unidade foi iniciada.', components: [] });
            }
        } catch (err) {
            logger.error('Erro no fluxo de composição de unidade', { action, guild: interaction.guildId, error: err.message });
            const reply = { content: '❌ Erro ao processar a montagem da unidade.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};
