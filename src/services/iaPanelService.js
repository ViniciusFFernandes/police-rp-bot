const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { COLOR } = require('../utils/embeds');
const logger = require('../utils/logger');

function buildIAPanelEmbed() {
    return new EmbedBuilder()
        .setColor(COLOR.INFO)
        .setTitle('🔍 Painel de Assuntos Internos')
        .setDescription(
            'Ferramentas para a equipe de Assuntos Internos.\n' +
            'Todas as respostas são visíveis apenas para você.'
        )
        .addFields(
            { name: '📂 Abrir Investigação', value: 'Inicia o fluxo de abertura de nova investigação.',                       inline: true },
            { name: '📋 Listar',             value: 'Lista investigações, com opção de filtrar por oficial.',               inline: true },
            { name: '🔎 Ver Investigação',   value: 'Exibe detalhes de uma investigação pelo número do caso.',              inline: true },
            { name: '⚖️ Aplicar Medida',     value: 'Aplica punição, afastamento ou outra medida a um oficial.',           inline: true },
            { name: '🗑️ Deletar',            value: 'Deleta permanentemente uma investigação (supervisores).',              inline: true },
        );
}

function buildIAPanelComponents() {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('iapanel:open')
            .setLabel('Abrir Investigação')
            .setEmoji('📂')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('iapanel:list')
            .setLabel('Listar')
            .setEmoji('📋')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('iapanel:view')
            .setLabel('Ver Investigação')
            .setEmoji('🔎')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('iapanel:measure')
            .setLabel('Aplicar Medida')
            .setEmoji('⚖️')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('iapanel:delete')
            .setLabel('Deletar')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger),
    );
    return [row];
}

async function refresh(guild) {
    try {
        const channelId = await guildConfigRepo.get(guild.id, 'ia_panel_channel_id');
        if (!channelId) return;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        const embed      = buildIAPanelEmbed();
        const components = buildIAPanelComponents();

        const savedMessageId = await guildConfigRepo.get(guild.id, 'ia_panel_message_id');

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
        await guildConfigRepo.set(guild.id, 'ia_panel_message_id', msg.id);
    } catch (err) {
        logger.warn('Não foi possível atualizar o painel de IA', {
            guild: guild.id,
            error: err.message,
        });
    }
}

module.exports = { refresh };
