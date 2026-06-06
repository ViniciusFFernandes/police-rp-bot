const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const guildConfigRepo = require('../repositories/guildConfigRepository');
const { COLOR } = require('../utils/embeds');
const logger = require('../utils/logger');

function buildAdminPanelEmbed() {
    return new EmbedBuilder()
        .setColor(COLOR.LOSS)
        .setTitle('🛡️ Painel Administrativo')
        .setDescription(
            'Ferramentas exclusivas para supervisores e administradores.\n' +
            'Todas as respostas são visíveis apenas para você.'
        )
        .addFields(
            { name: '🪪 Definir Perfil',         value: 'Define distrito, callsign, distintivo e nome de um oficial.',    inline: true },
            { name: '📊 Resumo de Oficial',       value: 'Exibe estatísticas gerais de turnos e armamentos.',              inline: true },
            { name: '📋 Histórico de Turnos',     value: 'Lista os últimos turnos encerrados do oficial.',                 inline: true },
            { name: '🗄️ Arsenal de Oficial',      value: 'Exibe o arsenal completo com histórico de extravios.',           inline: true },
            { name: '🚔 Turnos em Andamento',     value: 'Lista todos os turnos ativos no servidor no momento.',           inline: true },
            { name: '📢 Comunicado Geral',        value: 'Publica um comunicado marcando os oficiais no canal configurado.', inline: true },
        );
}

function buildAdminPanelComponents() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('adminpanel:profile_define')
            .setLabel('Definir Perfil')
            .setEmoji('🪪')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('adminpanel:history_resume')
            .setLabel('Resumo')
            .setEmoji('📊')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('adminpanel:history_shifts')
            .setLabel('Histórico de Turnos')
            .setEmoji('📋')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('adminpanel:history_arsenal')
            .setLabel('Arsenal')
            .setEmoji('🗄️')
            .setStyle(ButtonStyle.Secondary),
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('adminpanel:active_shifts')
            .setLabel('Turnos em Andamento')
            .setEmoji('🚔')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('adminpanel:announcement')
            .setLabel('Comunicado Geral')
            .setEmoji('📢')
            .setStyle(ButtonStyle.Primary),
    );
    return [row1, row2];
}

async function refresh(guild) {
    try {
        const channelId = await guildConfigRepo.get(guild.id, 'admin_panel_channel_id');
        if (!channelId) return;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        const embed      = buildAdminPanelEmbed();
        const components = buildAdminPanelComponents();

        const savedMessageId = await guildConfigRepo.get(guild.id, 'admin_panel_message_id');

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
        await guildConfigRepo.set(guild.id, 'admin_panel_message_id', msg.id);
    } catch (err) {
        logger.warn('Não foi possível atualizar o painel administrativo', {
            guild: guild.id,
            error: err.message,
        });
    }
}

module.exports = { refresh };
