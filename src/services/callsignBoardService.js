const { EmbedBuilder } = require('discord.js');
const guildConfigRepo    = require('../repositories/guildConfigRepository');
const officialProfileRepo = require('../repositories/officialProfileRepository');
const { COLOR } = require('../utils/embeds');
const logger = require('../utils/logger');

// Constrói o embed do quadro de callsigns com todos os perfis do servidor
function buildBoardEmbed(guild, profiles) {
    const embed = new EmbedBuilder()
        .setColor(COLOR.INFO)
        .setTitle('📋 Quadro de Callsigns Operacionais')
        .setFooter({ text: `${guild.name} · ${profiles.length} oficial(is) configurado(s)` })
        .setTimestamp();

    if (profiles.length === 0) {
        embed.setDescription('Nenhum oficial configurado ainda.\nUse `/oficial definir` para registrar seu distrito e callsign.');
        return embed;
    }

    // Agrupa por distrito para melhor leitura
    const byDistrict = new Map();
    for (const p of profiles) {
        const key = p.district;
        if (!byDistrict.has(key)) byDistrict.set(key, []);
        byDistrict.get(key).push(p);
    }

    for (const [district, members] of [...byDistrict.entries()].sort()) {
        const lines = members.map(p =>
            `<@${p.discord_id}> — \`${district}-<unidade>-${p.callsign_num}\``
        ).join('\n');

        embed.addFields({
            name: `📍 Distrito ${district}`,
            value: lines,
            inline: false,
        });
    }

    return embed;
}

// Atualiza (ou cria) a mensagem do quadro no canal configurado.
// Chamado sempre que um perfil é definido ou editado.
async function refresh(guild) {
    try {
        const channelId = await guildConfigRepo.get(guild.id, 'callsign_channel_id');
        if (!channelId) return; // canal não configurado — silencioso

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        const profiles = await officialProfileRepo.findAllByGuild(guild.id);
        const embed    = buildBoardEmbed(guild, profiles);

        const savedMessageId = await guildConfigRepo.get(guild.id, 'callsign_message_id');

        if (savedMessageId) {
            try {
                const msg = await channel.messages.fetch(savedMessageId);
                await msg.edit({ embeds: [embed] });
                return;
            } catch {
                // Mensagem foi deletada — cria uma nova abaixo
            }
        }

        const msg = await channel.send({ embeds: [embed] });
        await guildConfigRepo.set(guild.id, 'callsign_message_id', msg.id);
    } catch (err) {
        logger.warn('Não foi possível atualizar o quadro de callsigns', {
            guild: guild.id,
            error: err.message,
        });
    }
}

module.exports = { refresh, buildBoardEmbed };
