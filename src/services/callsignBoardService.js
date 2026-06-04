const { EmbedBuilder } = require('discord.js');
const guildConfigRepo    = require('../repositories/guildConfigRepository');
const officialProfileRepo = require('../repositories/officialProfileRepository');
const { COLOR } = require('../utils/embeds');
const logger = require('../utils/logger');

// Constrói o embed do quadro de callsigns agrupado por distrito
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

    // Agrupa perfis por distrito (já vêm ordenados por district, callsign_num do banco)
    const byDistrict = new Map();
    for (const p of profiles) {
        if (!byDistrict.has(p.district)) byDistrict.set(p.district, []);
        byDistrict.get(p.district).push(p);
    }

    for (const [district, members] of byDistrict) {
        const BADGE_W = 10;
        const CSN_W   = 6;
        const header  = `${'DISTINT'.padEnd(BADGE_W)}${'CSN'.padEnd(CSN_W)}OFICIAL`;
        const SEP     = '-'.repeat(header.length);
        const lines   = members.map(p => {
            const badge    = p.badge_num ? `#${p.badge_num}`.padEnd(BADGE_W) : '———'.padEnd(BADGE_W);
            const callsign = p.callsign_num.padEnd(CSN_W);
            const raw      = p.display_name || '—';
            const name     = raw.includes(' | ') ? raw.split(' | ').slice(1).join(' | ') : raw;
            return `${badge}${callsign}${name.slice(0, 16)}`;
        });

        embed.addFields({
            name: `🗺️ Distrito ${district}`,
            value: `\`\`\`\n${header}\n${SEP}\n${lines.join('\n')}\n\`\`\``,
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
