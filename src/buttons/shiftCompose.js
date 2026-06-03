const shiftService = require('../services/shiftService');
const pendingComposition = require('../utils/pendingComposition');
const { requireConfig } = require('../utils/configGuard');
const { buildStartShiftModal } = require('../utils/shiftForms');
const logger = require('../utils/logger');

// Cria o turno a partir da composição escolhida.
async function startFromComposition(interaction, callsign, vehiclePrefix, additionalDiscordIds) {
    await interaction.deferUpdate();

    const cfg = await requireConfig(interaction);
    if (!cfg) return;

    const result = await shiftService.startShift(interaction, cfg, {
        callsign,
        vehiclePrefix,
        additionalDiscordIds,
    });

    pendingComposition.clear(interaction.guildId, interaction.user.id);

    if (result.error) {
        return interaction.editReply({ content: `❌ ${result.error}`, components: [] });
    }

    const weaponInfo = result.weaponCount > 0
        ? `🔫 **${result.weaponCount} arma(s)** vinculadas automaticamente dos arsenais da equipe.`
        : '⚠️ Nenhuma arma vinculada — a equipe não possui armas ativas no arsenal. Use **Adicionar Arma** ou `/arma registrar`.';

    await interaction.editReply({
        content:
            `✅ **Unidade iniciada!**\n` +
            `Callsign: **${callsign}** · Viatura: **${vehiclePrefix}**\n` +
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
            // Seleção de oficiais adicionais — apenas guarda a escolha
            if (action === 'members') {
                pendingComposition.setMembers(interaction.guildId, interaction.user.id, interaction.values);
                return interaction.deferUpdate();
            }

            // Iniciar com os oficiais adicionais selecionados
            if (action === 'confirm') {
                const [, , callsign, vehiclePrefix] = parts;
                const additionalDiscordIds = pendingComposition.getMembers(interaction.guildId, interaction.user.id);
                return startFromComposition(interaction, callsign, vehiclePrefix, additionalDiscordIds);
            }

            // Iniciar unidade individual (sem adicionais)
            if (action === 'solo') {
                const [, , callsign, vehiclePrefix] = parts;
                return startFromComposition(interaction, callsign, vehiclePrefix, []);
            }

            // Fluxo de remodulação — abrir nova montagem de unidade
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
