const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shiftService = require('../services/shiftService');
const pendingComposition = require('../utils/pendingComposition');
const { requireConfig } = require('../utils/configGuard');
const { openCompositionScreen } = require('../utils/openCompositionScreen');
const logger = require('../utils/logger');

// Monta callsign e vehiclePrefix a partir dos dados guardados na composição.
function buildCallsign(district, unit, callsignNum) {
    return `${district}-${unit}-${callsignNum}`;
}

function buildVehiclePrefix(district, callsignNum) {
    return `${district}${callsignNum}`;
}

async function startFromComposition(interaction, additionalDiscordIds) {
    await interaction.deferUpdate();

    const cfg = await requireConfig(interaction);
    if (!cfg) return;

    const { district, callsignNum, unit, vehicle, memberIds } = pendingComposition.get(
        interaction.guildId, interaction.user.id
    );

    // Unidade é obrigatória
    if (!unit) {
        return interaction.followUp({
            content: '❌ Selecione uma **unidade** antes de iniciar o turno.',
            ephemeral: true,
        });
    }

    const callsign      = buildCallsign(district, unit, callsignNum);
    const vehiclePrefix = buildVehiclePrefix(district, callsignNum);
    const members       = additionalDiscordIds !== null ? additionalDiscordIds : memberIds;

    const result = await shiftService.startShift(interaction, cfg, {
        callsign,
        vehiclePrefix,
        additionalDiscordIds: members,
        vehicle: vehicle || null,
    });

    pendingComposition.clear(interaction.guildId, interaction.user.id);

    if (result.error) {
        return interaction.editReply({ content: `❌ ${result.error}`, components: [] });
    }

    const vehicleInfo = vehicle ? `🚗 Viatura: **${vehicle}**\n` : '';
    const weaponInfo  = result.weaponCount > 0
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
        const parts  = interaction.customId.split(':');
        const action = parts[1];

        try {
            // Seleção de unidade — habilita os botões de confirmação
            if (action === 'unit') {
                pendingComposition.setUnit(interaction.guildId, interaction.user.id, interaction.values[0]);

                const { district, callsignNum } = pendingComposition.get(interaction.guildId, interaction.user.id);
                const unit = interaction.values[0];
                const preview = district && callsignNum ? buildCallsign(district, unit, callsignNum) : unit;

                return interaction.update({
                    content: interaction.message.content.replace(
                        /`[^`]+`/,
                        `\`${preview}\``
                    ),
                    components: interaction.message.components.map(row => {
                        const rebuilt = ActionRowBuilder.from(row);
                        rebuilt.components = row.components.map(c => {
                            if (c.customId === 'shiftcompose:confirm')
                                return ButtonBuilder.from(c).setDisabled(false);
                            return c;
                        });
                        return rebuilt;
                    }),
                });
            }

            // Seleção de viatura
            if (action === 'vehicle') {
                pendingComposition.setVehicle(interaction.guildId, interaction.user.id, interaction.values[0]);
                return interaction.deferUpdate();
            }

            // Seleção de membros adicionais
            if (action === 'members') {
                pendingComposition.setMembers(interaction.guildId, interaction.user.id, interaction.values);
                return interaction.deferUpdate();
            }

            // Inicia turno com os membros selecionados (pode ser nenhum = solo)
            if (action === 'confirm') {
                const { memberIds } = pendingComposition.get(interaction.guildId, interaction.user.id);
                return startFromComposition(interaction, memberIds);
            }

            // Remodulação — reabre tela de composição com perfil do oficial
            if (action === 'new') {
                await interaction.deferUpdate();
                return openCompositionScreen(interaction);
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
