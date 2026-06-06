const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { COLOR } = require('../utils/embeds');
const logger = require('../utils/logger');

function buildCivilPanelEmbed() {
    return new EmbedBuilder()
        .setColor(COLOR.INFO)
        .setTitle('📢 Ouvidoria — Denúncias Civis')
        .setDescription(
            'Use este painel para registrar uma denúncia sobre a conduta de um policial.\n' +
            'Sua denúncia será encaminhada à Corregedoria, que avaliará se uma investigação interna será aberta.\n\n' +
            '⚠️ Você pode denunciar **se identificando** ou de forma **anônima**. ' +
            'Denúncias anônimas não podem ser consultadas posteriormente, pois não ficam vinculadas ao seu usuário.'
        )
        .addFields(
            { name: '📢 Fazer Denúncia',     value: 'Abre o formulário para registrar uma nova denúncia.', inline: true },
            { name: '📂 Minhas Denúncias',   value: 'Lista as denúncias identificadas que você registrou.', inline: true },
        );
}

function buildCivilPanelComponents() {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('civilpanel:denunciar')
            .setLabel('Fazer Denúncia')
            .setEmoji('📢')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('civilpanel:minhas')
            .setLabel('Minhas Denúncias')
            .setEmoji('📂')
            .setStyle(ButtonStyle.Secondary),
    );

    return [row];
}

async function refresh(guild) {
    try {
        const channelId = await guildConfigRepo.get(guild.id, 'civil_panel_channel_id');
        if (!channelId) return;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        const embed      = buildCivilPanelEmbed();
        const components = buildCivilPanelComponents();

        const savedMessageId = await guildConfigRepo.get(guild.id, 'civil_panel_message_id');

        if (savedMessageId) {
            try {
                const msg = await channel.messages.fetch(savedMessageId);
                await msg.edit({ embeds: [embed], components });
                return;
            } catch {
                // Mensagem foi deletada — cria uma nova abaixo
            }
        }

        const msg = await channel.send({ embeds: [embed], components });
        await guildConfigRepo.set(guild.id, 'civil_panel_message_id', msg.id);
    } catch (err) {
        logger.warn('Não foi possível atualizar o painel civil', {
            guild: guild.id,
            error: err.message,
        });
    }
}

module.exports = { refresh, buildCivilPanelEmbed, buildCivilPanelComponents };
