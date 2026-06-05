const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { COLOR } = require('../utils/embeds');
const logger = require('../utils/logger');

function buildPanelEmbed() {
    return new EmbedBuilder()
        .setColor(COLOR.INFO)
        .setTitle('🚔 Painel Operacional')
        .setDescription(
            'Use os botões abaixo para acessar as funções mais comuns sem precisar de comandos.\n' +
            'Todas as respostas são visíveis apenas para você.'
        )
        .addFields(
            { name: '🔫 Registrar Arma',  value: 'Adiciona uma arma ao seu arsenal pessoal.',              inline: true },
            { name: '🗄️ Ver Arsenal',      value: 'Lista suas armas ativas.',                               inline: true },
            { name: '🚨 Extravio de Arma', value: 'Registra o extravio de uma arma fora de turno.',        inline: true },
            { name: '👮 Ver Perfil',       value: 'Exibe seu perfil operacional (distrito, callsign etc.).', inline: true },
        );
}

function buildPanelComponents() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('panel:weapon_register')
            .setLabel('Registrar Arma')
            .setEmoji('🔫')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('panel:weapon_arsenal')
            .setLabel('Ver Arsenal')
            .setEmoji('🗄️')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('panel:weapon_loss')
            .setLabel('Extravio de Arma')
            .setEmoji('🚨')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('panel:profile_view')
            .setLabel('Ver Perfil')
            .setEmoji('👮')
            .setStyle(ButtonStyle.Secondary),
    );
    return [row1];
}

async function refresh(guild) {
    try {
        const channelId = await guildConfigRepo.get(guild.id, 'panel_channel_id');
        if (!channelId) return;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        const embed      = buildPanelEmbed();
        const components = buildPanelComponents();

        const savedMessageId = await guildConfigRepo.get(guild.id, 'panel_message_id');

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
        await guildConfigRepo.set(guild.id, 'panel_message_id', msg.id);
    } catch (err) {
        logger.warn('Não foi possível atualizar o painel operacional', {
            guild: guild.id,
            error: err.message,
        });
    }
}

module.exports = { refresh };
