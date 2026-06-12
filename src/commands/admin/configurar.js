const {
    SlashCommandBuilder,
    ChannelType,
} = require('discord.js');
const guildConfigService    = require('../../services/guildConfigService');
const guildConfigRepo       = require('../../repositories/guildConfigRepository');
const callsignBoardService  = require('../../services/callsignBoardService');
const panelService          = require('../../services/panelService');
const adminPanelService     = require('../../services/adminPanelService');
const iaPanelService        = require('../../services/iaPanelService');
const civilPanelService     = require('../../services/civilPanelService');
const hpPanelService        = require('../../services/hpPanelService');
const hpAdminPanelService   = require('../../services/hpAdminPanelService');
const { isConfigManager } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Configura o bot para este servidor')
        .addSubcommand(sub =>
            sub.setName('canal-turnos')
                .setDescription('Canal onde as embeds de turno são postadas')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-relatorios')
                .setDescription('Canal de relatórios de turno encerrado')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-armamento')
                .setDescription('Canal de relatórios de extravio de armamento')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('categoria-voz')
                .setDescription('Categoria onde canais de voz de turno são criados')
                .addChannelOption(opt =>
                    opt.setName('categoria')
                        .setDescription('Selecione a categoria')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-callsign')
                .setDescription('Canal onde o quadro de callsigns dos oficiais é mantido e atualizado automaticamente')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-ia')
                .setDescription('Canal onde os quadros das investigações de Assuntos Internos são publicados')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('categoria-ia')
                .setDescription('Categoria onde os canais temporários de coleta de provas de IA são criados')
                .addChannelOption(opt =>
                    opt.setName('categoria')
                        .setDescription('Selecione a categoria')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-provas-ia')
                .setDescription('Canal onde os arquivos de provas das investigações são arquivados')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-painel')
                .setDescription('Canal onde o painel operacional com botões de ação é publicado')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-painel-admin')
                .setDescription('Canal onde o painel administrativo para supervisores é publicado')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-painel-ia')
                .setDescription('Canal onde o painel de Assuntos Internos é publicado')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-relatorios-sr')
                .setDescription('Canal onde os relatórios de serviço (ocorrências, prisões) são publicados')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-provas-sr')
                .setDescription('Canal onde os arquivos de provas dos relatórios de serviço são arquivados')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('categoria-sr')
                .setDescription('Categoria onde os canais temporários de coleta de provas de SR são criados')
                .addChannelOption(opt =>
                    opt.setName('categoria')
                        .setDescription('Selecione a categoria')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-medidas-ia')
                .setDescription('Canal onde os alertas de medidas disciplinares (punições, afastamentos) são enviados')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-painel-civil')
                .setDescription('Canal onde o painel de denúncias para civis é publicado')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-denuncias-civis')
                .setDescription('Canal onde a Corregedoria avalia as denúncias registradas por civis')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('categoria-denuncias-civis')
                .setDescription('Categoria onde os canais temporários de coleta de provas de denúncias civis são criados')
                .addChannelOption(opt =>
                    opt.setName('categoria')
                        .setDescription('Selecione a categoria')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-provas-denuncias-civis')
                .setDescription('Canal onde os arquivos de provas das denúncias civis são arquivados')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-comunicados')
                .setDescription('Canal onde os comunicados gerais para os oficiais são publicados')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-notificacoes-transito')
                .setDescription('Canal onde as notificações de novas advertências de trânsito são enviadas')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        // ── Hospital ──────────────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('hp-canal-painel')
                .setDescription('Canal onde o painel operacional do hospital é publicado')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('hp-canal-admin')
                .setDescription('Canal onde o painel administrativo do hospital é publicado')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('hp-canal-turnos')
                .setDescription('Canal onde as embeds de turno do hospital são postadas')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('hp-canal-relatorios')
                .setDescription('Canal onde os relatórios de turno encerrado do hospital são enviados')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('hp-cargos')
                .setDescription('Cargos que podem usar o painel do hospital (membros da equipe)')
                .addRoleOption(opt =>
                    opt.setName('cargo1').setDescription('Cargo 1').setRequired(true)
                )
                .addRoleOption(opt =>
                    opt.setName('cargo2').setDescription('Cargo 2 (opcional)').setRequired(false)
                )
                .addRoleOption(opt =>
                    opt.setName('cargo3').setDescription('Cargo 3 (opcional)').setRequired(false)
                )
                .addRoleOption(opt =>
                    opt.setName('cargo4').setDescription('Cargo 4 (opcional)').setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('hp-supervisores')
                .setDescription('Cargos de supervisores do hospital (acesso ao painel admin)')
                .addRoleOption(opt =>
                    opt.setName('cargo1').setDescription('Cargo 1').setRequired(true)
                )
                .addRoleOption(opt =>
                    opt.setName('cargo2').setDescription('Cargo 2 (opcional)').setRequired(false)
                )
                .addRoleOption(opt =>
                    opt.setName('cargo3').setDescription('Cargo 3 (opcional)').setRequired(false)
                )
                .addRoleOption(opt =>
                    opt.setName('cargo4').setDescription('Cargo 4 (opcional)').setRequired(false)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const sub     = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (!await isConfigManager(interaction.member)) {
            return interaction.editReply({
                content: '❌ Você não tem permissão para usar este comando.\nApenas **Administradores** e **Gestores de Configuração** podem configurar o bot.',
            });
        }

        const KEY_MAP = {
            'canal-turnos':     'shift_channel_id',
            'canal-relatorios': 'report_channel_id',
            'canal-armamento':  'weapon_report_channel_id',
            'categoria-voz':    'voice_category_id',
            'canal-callsign':   'callsign_channel_id',
            'canal-ia':         'ia_channel_id',
            'categoria-ia':     'ia_category_id',
            'canal-provas-ia':  'ia_evidence_channel_id',
            'canal-painel':       'panel_channel_id',
            'canal-painel-admin': 'admin_panel_channel_id',
            'canal-painel-ia':    'ia_panel_channel_id',
            'canal-relatorios-sr': 'sr_channel_id',
            'canal-provas-sr':     'sr_evidence_channel_id',
            'categoria-sr':        'sr_category_id',
            'canal-medidas-ia':    'ia_measures_channel_id',
            'canal-painel-civil':     'civil_panel_channel_id',
            'canal-denuncias-civis':  'civil_complaints_channel_id',
            'categoria-denuncias-civis':     'civil_complaints_category_id',
            'canal-provas-denuncias-civis':  'civil_evidence_channel_id',
            'canal-notificacoes-transito':   'traffic_warnings_channel_id',
            'canal-comunicados':             'announcements_channel_id',
            // Hospital
            'hp-canal-painel':      'hp_panel_channel_id',
            'hp-canal-admin':       'hp_admin_panel_channel_id',
            'hp-canal-turnos':      'hp_shift_channel_id',
            'hp-canal-relatorios':  'hp_report_channel_id',
        };

        if (KEY_MAP[sub]) {
            const optionName = (sub === 'categoria-voz' || sub === 'categoria-ia' || sub === 'categoria-sr' || sub === 'categoria-denuncias-civis') ? 'categoria' : 'canal';
            const channel = interaction.options.getChannel(optionName);
            const meta = await guildConfigService.setChannel(guildId, KEY_MAP[sub], channel);

            // Ao configurar o canal de callsigns, descarta a mensagem anterior
            // (estava no canal antigo) e publica o quadro imediatamente
            if (sub === 'canal-callsign') {
                await guildConfigRepo.set(guildId, 'callsign_message_id', null);
                await callsignBoardService.refresh(interaction.guild);
                return interaction.editReply({
                    content: `✅ **${meta.emoji} ${meta.label}** configurado para ${channel}.\nO quadro de callsigns foi publicado nesse canal e será atualizado automaticamente.`,
                });
            }

            if (sub === 'canal-painel') {
                await deleteOldPanelMessage(interaction.guild, 'panel_message_id');
                await guildConfigRepo.set(guildId, 'panel_message_id', null);
                await panelService.refresh(interaction.guild);
                return interaction.editReply({
                    content: `✅ **${meta.emoji} ${meta.label}** configurado para ${channel}.\nO painel operacional foi publicado nesse canal.`,
                });
            }

            if (sub === 'canal-painel-admin') {
                await deleteOldPanelMessage(interaction.guild, 'admin_panel_message_id');
                await guildConfigRepo.set(guildId, 'admin_panel_message_id', null);
                await adminPanelService.refresh(interaction.guild);
                return interaction.editReply({
                    content: `✅ **${meta.emoji} ${meta.label}** configurado para ${channel}.\nO painel administrativo foi publicado nesse canal.`,
                });
            }

            if (sub === 'canal-painel-ia') {
                await deleteOldPanelMessage(interaction.guild, 'ia_panel_message_id');
                await guildConfigRepo.set(guildId, 'ia_panel_message_id', null);
                await iaPanelService.refresh(interaction.guild);
                return interaction.editReply({
                    content: `✅ **${meta.emoji} ${meta.label}** configurado para ${channel}.\nO painel de Assuntos Internos foi publicado nesse canal.`,
                });
            }

            if (sub === 'canal-painel-civil') {
                await deleteOldPanelMessage(interaction.guild, 'civil_panel_message_id');
                await guildConfigRepo.set(guildId, 'civil_panel_message_id', null);
                await civilPanelService.refresh(interaction.guild);
                return interaction.editReply({
                    content: `✅ **${meta.emoji} ${meta.label}** configurado para ${channel}.\nO painel de denúncias civis foi publicado nesse canal.`,
                });
            }

            if (sub === 'hp-canal-painel') {
                await deleteOldPanelMessage(interaction.guild, 'hp_panel_message_id');
                await guildConfigRepo.set(guildId, 'hp_panel_message_id', null);
                await hpPanelService.refresh(interaction.guild);
                return interaction.editReply({
                    content: `✅ **${meta.emoji} ${meta.label}** configurado para ${channel}.\nO painel do hospital foi publicado nesse canal.`,
                });
            }

            if (sub === 'hp-canal-admin') {
                await deleteOldPanelMessage(interaction.guild, 'hp_admin_panel_message_id');
                await guildConfigRepo.set(guildId, 'hp_admin_panel_message_id', null);
                await hpAdminPanelService.refresh(interaction.guild);
                return interaction.editReply({
                    content: `✅ **${meta.emoji} ${meta.label}** configurado para ${channel}.\nO painel administrativo do hospital foi publicado nesse canal.`,
                });
            }

            return interaction.editReply({
                content: `✅ **${meta.emoji} ${meta.label}** configurado para ${channel}.`,
            });
        }

        // ── Cargos do Hospital ────────────────────────────────────────────────
        if (sub === 'hp-cargos' || sub === 'hp-supervisores') {
            const roles = ['cargo1', 'cargo2', 'cargo3', 'cargo4']
                .map(name => interaction.options.getRole(name))
                .filter(Boolean);

            const roleIds = roles.map(r => r.id);

            if (sub === 'hp-cargos') {
                await guildConfigRepo.setHpRoles(guildId, roleIds);
                return interaction.editReply({
                    content: `✅ **🏥 Cargos do Hospital** definidos: ${roles.map(r => `<@&${r.id}>`).join(', ')}`,
                });
            }

            await guildConfigRepo.setHpSupervisorRoles(guildId, roleIds);
            return interaction.editReply({
                content: `✅ **🏥 Supervisores do Hospital** definidos: ${roles.map(r => `<@&${r.id}>`).join(', ')}`,
            });
        }

    },
};

// Busca e deleta a mensagem de painel antiga antes de publicar uma nova
async function deleteOldPanelMessage(guild, messageIdKey) {
    try {
        const msgId = await guildConfigRepo.get(guild.id, messageIdKey);
        if (!msgId) return;

        // Precisamos descobrir em qual canal está a mensagem — tentamos todos os canais de texto
        for (const channel of guild.channels.cache.values()) {
            if (channel.type !== 0) continue; // apenas GuildText
            try {
                const msg = await channel.messages.fetch(msgId);
                await msg.delete();
                return;
            } catch {
                // mensagem não está nesse canal — continua
            }
        }
    } catch {
        // silencioso — não bloqueia a atualização se falhar
    }
}
