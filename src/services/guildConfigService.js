const guildConfigRepo = require('../repositories/guildConfigRepository');
const { EmbedBuilder } = require('discord.js');

const CONFIG_META = {
    shift_channel_id: {
        label: 'Canal de Turnos',
        emoji: '📋',
        type: 'channel',
        description: 'Canal onde as embeds de turno são postadas',
    },
    report_channel_id: {
        label: 'Canal de Relatórios',
        emoji: '📊',
        type: 'channel',
        description: 'Canal onde relatórios de turno encerrado são enviados',
    },
    weapon_report_channel_id: {
        label: 'Canal de Extravios',
        emoji: '⚠️',
        type: 'channel',
        description: 'Canal onde relatórios de extravio de arma são enviados',
    },
    voice_category_id: {
        label: 'Categoria de Voz',
        emoji: '🎙️',
        type: 'category',
        description: 'Categoria onde os canais de voz de turno são criados',
    },
    supervisor_role_ids: {
        label: 'Cargos Supervisores',
        emoji: '🎖️',
        type: 'roles',
        description: 'Cargos que podem gerenciar turnos de outros oficiais',
    },
};

async function setChannel(guildId, key, channel) {
    await guildConfigRepo.set(guildId, key, channel.id);
    return CONFIG_META[key];
}

async function setRole(guildId, role, add = true) {
    const current = await guildConfigRepo.getSupervisorRoles(guildId);
    let updated;
    if (add) {
        updated = [...new Set([...current, role.id])];
    } else {
        updated = current.filter(id => id !== role.id);
    }
    await guildConfigRepo.setSupervisorRoles(guildId, updated);
    return updated;
}

async function buildConfigEmbed(guild) {
    const cfg = await guildConfigRepo.getAll(guild.id);
    const configured = await guildConfigRepo.isConfigured(guild.id);

    const fields = [];

    for (const [key, meta] of Object.entries(CONFIG_META)) {
        const value = cfg[key];
        if (meta.type === 'roles') {
            const roles = value ? JSON.parse(value) : [];
            fields.push({
                name: `${meta.emoji} ${meta.label}`,
                value: roles.length > 0 ? roles.map(id => `<@&${id}>`).join(', ') : '❌ Não configurado',
                inline: false,
            });
        } else {
            fields.push({
                name: `${meta.emoji} ${meta.label}`,
                value: value
                    ? (meta.type === 'category' ? `\`${guild.channels.cache.get(value)?.name ?? value}\`` : `<#${value}>`)
                    : '❌ Não configurado',
                inline: true,
            });
        }
    }

    return new EmbedBuilder()
        .setColor(configured ? 0x2ECC71 : 0xE74C3C)
        .setTitle(`⚙️ Configurações — ${guild.name}`)
        .setDescription(
            configured
                ? '✅ Servidor totalmente configurado.'
                : '⚠️ Configuração incompleta. Use `/configurar` para ajustar os itens marcados.'
        )
        .addFields(fields)
        .setFooter({ text: `Guild ID: ${guild.id}` })
        .setTimestamp();
}

module.exports = { setChannel, setRole, buildConfigEmbed, CONFIG_META };
