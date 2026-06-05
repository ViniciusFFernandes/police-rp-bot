// Abre a tela de montagem da unidade a partir do perfil do oficial.
// Usado por /iniciar e pelo fluxo de remodulação (botão shiftcompose:new).
const {
    ActionRowBuilder,
    UserSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
} = require('discord.js');
const userRepo            = require('../repositories/userRepository');
const officialProfileRepo = require('../repositories/officialProfileRepository');
const vehicleRepo         = require('../repositories/vehicleRepository');
const unitRepo            = require('../repositories/unitRepository');
const pendingComposition  = require('./pendingComposition');
const { requireConfig }   = require('./configGuard');

async function openCompositionScreen(interaction) {
    const cfg = await requireConfig(interaction);
    if (!cfg) return;

    const dbUser = await userRepo.upsert(
        interaction.user.id,
        interaction.user.username,
        interaction.member.displayName,
    );

    const profile = await officialProfileRepo.findByUser(dbUser.id, interaction.guildId);

    if (!profile) {
        const msg = {
            content:
                '⚠️ **Você ainda não configurou seu perfil operacional neste servidor.**\n\n' +
                'Use `/oficial definir` para registrar seu distrito e callsign antes de iniciar um turno.',
            ephemeral: true,
        };
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply({ ...msg, components: [] });
        }
        return interaction.reply(msg);
    }

    const { district, callsign_num: callsignNum } = profile;
    pendingComposition.setBase(interaction.guildId, interaction.user.id, district, callsignNum);

    const [units, vehicles] = await Promise.all([
        unitRepo.findActive(interaction.guildId),
        vehicleRepo.findActive(interaction.guildId),
    ]);

    const hasUnits = units.length > 0;
    const components = [];

    if (hasUnits) {
        components.push(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('shiftcompose:unit')
                .setPlaceholder('Selecione a unidade (ex: A, L, K...)')
                .addOptions(units.map(u => ({ label: u.name, value: u.name })))
        ));
    }

    if (vehicles.length > 0) {
        components.push(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('shiftcompose:vehicle')
                .setPlaceholder('Selecione a viatura (opcional)')
                .addOptions(vehicles.map(v => ({ label: v.name, value: v.name })))
        ));
    }

    components.push(new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
            .setCustomId('shiftcompose:members')
            .setPlaceholder('Oficiais adicionais da unidade (opcional)')
            .setMinValues(0)
            .setMaxValues(5)
    ));

    components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('shiftcompose:confirm')
            .setLabel('Iniciar Turno')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
            .setDisabled(hasUnits),
    ));

    const previewCallsign = hasUnits
        ? `${district}-<unidade>-${callsignNum}`
        : `${district}-???-${callsignNum}`;

    const notes = [];
    if (hasUnits)            notes.push('Selecione a **unidade**.');
    else                     notes.push('⚠️ Nenhuma unidade cadastrada — use `/unidade registrar`.');
    if (vehicles.length > 0) notes.push('Selecione a **viatura** (opcional).');
    notes.push('Adicione **oficiais adicionais** se houver mais alguém na viatura (opcional).');

    const content =
        `🚔 **Montagem da Unidade Operacional**\n` +
        `📍 Distrito: **${district}** · 📟 Callsign: **${callsignNum}**\n\n` +
        `Você será o **responsável** (motorista/líder).\n` +
        notes.join('\n');

    if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content, components });
    }
    return interaction.reply({ content, components, ephemeral: true });
}

module.exports = { openCompositionScreen };
