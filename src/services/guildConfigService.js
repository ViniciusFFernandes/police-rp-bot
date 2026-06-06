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
    config_manager_role_ids: {
        label: 'Gestores de Configuração',
        emoji: '🔧',
        type: 'roles',
        description: 'Cargos que podem usar /configurar, /veiculo e /unidade',
    },
    callsign_channel_id: {
        label: 'Canal de Callsigns',
        emoji: '📋',
        type: 'channel',
        description: 'Canal onde o quadro de callsigns dos oficiais é mantido',
    },
    ia_channel_id: {
        label: 'Canal de Assuntos Internos',
        emoji: '🔍',
        type: 'channel',
        description: 'Canal onde os quadros de investigações internas são publicados',
    },
    ia_category_id: {
        label: 'Categoria de Assuntos Internos',
        emoji: '🔍',
        type: 'category',
        description: 'Categoria onde os canais temporários de coleta de provas são criados',
    },
    ia_evidence_channel_id: {
        label: 'Canal de Provas de IA',
        emoji: '📎',
        type: 'channel',
        description: 'Canal onde os arquivos de provas das investigações são arquivados',
    },
    ia_role_ids: {
        label: 'Cargos de Assuntos Internos',
        emoji: '🔍',
        type: 'roles',
        description: 'Cargos que podem abrir e gerenciar investigações internas',
    },
    police_role_ids: {
        label: 'Cargos Policiais (Acesso ao Bot)',
        emoji: '🚔',
        type: 'roles',
        description: 'Somente esses cargos podem usar o bot. Se vazio, todos têm acesso.',
    },
    panel_channel_id: {
        label: 'Canal do Painel Operacional',
        emoji: '🚔',
        type: 'channel',
        description: 'Canal onde o painel operacional com botões de ação é publicado',
    },
    admin_panel_channel_id: {
        label: 'Canal do Painel Administrativo',
        emoji: '🛡️',
        type: 'channel',
        description: 'Canal onde o painel administrativo para supervisores é publicado',
    },
    ia_panel_channel_id: {
        label: 'Canal do Painel de Assuntos Internos',
        emoji: '🔍',
        type: 'channel',
        description: 'Canal onde o painel de IA com botões de ação é publicado',
    },
    sr_channel_id: {
        label: 'Canal de Relatórios de Serviço',
        emoji: '📋',
        type: 'channel',
        description: 'Canal onde os quadros de Relatórios de Serviço são publicados',
    },
    sr_category_id: {
        label: 'Categoria de Relatórios de Serviço',
        emoji: '📋',
        type: 'category',
        description: 'Categoria onde os canais temporários de coleta de provas de SR são criados',
    },
    sr_evidence_channel_id: {
        label: 'Canal de Provas de SR',
        emoji: '📎',
        type: 'channel',
        description: 'Canal onde os arquivos de provas dos Relatórios de Serviço são arquivados',
    },
    ia_measures_channel_id: {
        label: 'Canal de Medidas Disciplinares',
        emoji: '⚖️',
        type: 'channel',
        description: 'Canal onde os alertas de punições e afastamentos de oficiais são enviados',
    },
    civil_panel_channel_id: {
        label: 'Canal do Painel Civil',
        emoji: '📢',
        type: 'channel',
        description: 'Canal onde o painel de denúncias para civis é publicado',
    },
    civil_complaints_channel_id: {
        label: 'Canal de Avaliação de Denúncias Civis',
        emoji: '📝',
        type: 'channel',
        description: 'Canal onde a Corregedoria avalia as denúncias registradas por civis',
    },
    civil_complaints_category_id: {
        label: 'Categoria de Provas de Denúncias Civis',
        emoji: '📢',
        type: 'channel',
        description: 'Categoria onde os canais temporários de coleta de provas de denúncias civis são criados',
    },
    civil_evidence_channel_id: {
        label: 'Canal de Arquivo de Provas Civis',
        emoji: '📎',
        type: 'channel',
        description: 'Canal onde os arquivos de provas das denúncias civis são arquivados',
    },
    traffic_warnings_channel_id: {
        label: 'Canal de Notificações de Trânsito',
        emoji: '🚦',
        type: 'channel',
        description: 'Canal onde as notificações de novas advertências de trânsito são enviadas',
    },
};

async function setChannel(guildId, key, channel) {
    await guildConfigRepo.set(guildId, key, channel.id);
    return CONFIG_META[key];
}

async function setRole(guildId, role, add = true) {
    const current = await guildConfigRepo.getSupervisorRoles(guildId);
    const updated = add
        ? [...new Set([...current, role.id])]
        : current.filter(id => id !== role.id);
    await guildConfigRepo.setSupervisorRoles(guildId, updated);
    return updated;
}

async function setPoliceRole(guildId, role, add = true) {
    const current = await guildConfigRepo.getPoliceRoles(guildId);
    const updated = add
        ? [...new Set([...current, role.id])]
        : current.filter(id => id !== role.id);
    await guildConfigRepo.setPoliceRoles(guildId, updated);
    return updated;
}

async function setIARole(guildId, role, add = true) {
    const current = await guildConfigRepo.getIARoles(guildId);
    const updated = add
        ? [...new Set([...current, role.id])]
        : current.filter(id => id !== role.id);
    await guildConfigRepo.setIARoles(guildId, updated);
    return updated;
}

async function setConfigManagerRole(guildId, role, add = true) {
    const current = await guildConfigRepo.getConfigManagerRoles(guildId);
    const updated = add
        ? [...new Set([...current, role.id])]
        : current.filter(id => id !== role.id);
    await guildConfigRepo.setConfigManagerRoles(guildId, updated);
    return updated;
}

async function buildConfigEmbed(guild) {
    const cfg = await guildConfigRepo.getAll(guild.id);
    const configured = await guildConfigRepo.isConfigured(guild.id);

    const fields = [];

    for (const [key, meta] of Object.entries(CONFIG_META)) {
        const value = cfg[key];
        if (meta.type === 'roles') {
            let roles = [];
            try { roles = value ? JSON.parse(value) : []; } catch { roles = []; }
            // Gestores de configuração podem não estar definidos sem ser um problema crítico
            const optional = key === 'config_manager_role_ids';
            fields.push({
                name: `${meta.emoji} ${meta.label}`,
                value: roles.length > 0
                    ? roles.map(id => `<@&${id}>`).join(', ')
                    : optional ? '— Nenhum (somente Administradores)' : '❌ Não configurado',
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

module.exports = { setChannel, setRole, setPoliceRole, setIARole, setConfigManagerRole, buildConfigEmbed, CONFIG_META };
