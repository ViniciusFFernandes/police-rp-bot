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
const { isConfigManager, isAdmin } = require('../../utils/permissions');

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
            sub.setName('cargo-supervisor')
                .setDescription('Adiciona ou remove um cargo supervisor')
                .addRoleOption(opt =>
                    opt.setName('cargo')
                        .setDescription('Cargo a modificar')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('acao')
                        .setDescription('Adicionar ou remover o cargo')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Adicionar', value: 'add' },
                            { name: 'Remover',   value: 'remove' },
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('cargo-policia')
                .setDescription('Adiciona ou remove um cargo com acesso ao bot (sem cargos configurados, todos podem usar)')
                .addRoleOption(opt =>
                    opt.setName('cargo')
                        .setDescription('Cargo a modificar')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('acao')
                        .setDescription('Adicionar ou remover o cargo')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Adicionar', value: 'add' },
                            { name: 'Remover',   value: 'remove' },
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('cargo-ia')
                .setDescription('Adiciona ou remove um cargo de Assuntos Internos')
                .addRoleOption(opt =>
                    opt.setName('cargo')
                        .setDescription('Cargo a modificar')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('acao')
                        .setDescription('Adicionar ou remover o cargo')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Adicionar', value: 'add' },
                            { name: 'Remover',   value: 'remove' },
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('cargo-gestor')
                .setDescription('Adiciona ou remove um cargo gestor de configurações do bot (somente Administradores)')
                .addRoleOption(opt =>
                    opt.setName('cargo')
                        .setDescription('Cargo a modificar')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('acao')
                        .setDescription('Adicionar ou remover o cargo')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Adicionar', value: 'add' },
                            { name: 'Remover',   value: 'remove' },
                        )
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const sub     = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        // Gestão dos próprios cargos gestores é exclusiva de Administradores
        if (sub === 'cargo-gestor' && !isAdmin(interaction.member)) {
            return interaction.editReply({
                content: '❌ Apenas **Administradores** do servidor podem gerenciar os cargos gestores de configuração.',
            });
        }

        // Demais subcomandos: Admin OU cargo gestor
        if (sub !== 'cargo-gestor' && !await isConfigManager(interaction.member)) {
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
        };

        if (KEY_MAP[sub]) {
            const optionName = (sub === 'categoria-voz' || sub === 'categoria-ia') ? 'categoria' : 'canal';
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
                await guildConfigRepo.set(guildId, 'panel_message_id', null);
                await panelService.refresh(interaction.guild);
                return interaction.editReply({
                    content: `✅ **${meta.emoji} ${meta.label}** configurado para ${channel}.\nO painel operacional foi publicado nesse canal.`,
                });
            }

            if (sub === 'canal-painel-admin') {
                await guildConfigRepo.set(guildId, 'admin_panel_message_id', null);
                await adminPanelService.refresh(interaction.guild);
                return interaction.editReply({
                    content: `✅ **${meta.emoji} ${meta.label}** configurado para ${channel}.\nO painel administrativo foi publicado nesse canal.`,
                });
            }

            if (sub === 'canal-painel-ia') {
                await guildConfigRepo.set(guildId, 'ia_panel_message_id', null);
                await iaPanelService.refresh(interaction.guild);
                return interaction.editReply({
                    content: `✅ **${meta.emoji} ${meta.label}** configurado para ${channel}.\nO painel de Assuntos Internos foi publicado nesse canal.`,
                });
            }

            return interaction.editReply({
                content: `✅ **${meta.emoji} ${meta.label}** configurado para ${channel}.`,
            });
        }

        if (sub === 'cargo-supervisor') {
            const role   = interaction.options.getRole('cargo');
            const action = interaction.options.getString('acao');
            const updated = await guildConfigService.setRole(guildId, role, action === 'add');
            const list = updated.length > 0 ? updated.map(id => `<@&${id}>`).join(', ') : 'Nenhum';
            const verb = action === 'add' ? 'adicionado' : 'removido';
            return interaction.editReply({
                content: `✅ Cargo ${role} **${verb}**.\nSupervisores atuais: ${list}`,
            });
        }

        if (sub === 'cargo-policia') {
            const role   = interaction.options.getRole('cargo');
            const action = interaction.options.getString('acao');
            const updated = await guildConfigService.setPoliceRole(guildId, role, action === 'add');
            const list = updated.length > 0 ? updated.map(id => `<@&${id}>`).join(', ') : 'Nenhum (todos podem usar o bot)';
            const verb = action === 'add' ? 'adicionado' : 'removido';
            return interaction.editReply({
                content: `✅ Cargo ${role} **${verb}** como cargo policial.\nCargos com acesso ao bot: ${list}`,
            });
        }

        if (sub === 'cargo-ia') {
            const role   = interaction.options.getRole('cargo');
            const action = interaction.options.getString('acao');
            const updated = await guildConfigService.setIARole(guildId, role, action === 'add');
            const list = updated.length > 0 ? updated.map(id => `<@&${id}>`).join(', ') : 'Nenhum';
            const verb = action === 'add' ? 'adicionado' : 'removido';
            return interaction.editReply({
                content: `✅ Cargo ${role} **${verb}** como Assuntos Internos.\nCargos de IA atuais: ${list}`,
            });
        }

        if (sub === 'cargo-gestor') {
            const role   = interaction.options.getRole('cargo');
            const action = interaction.options.getString('acao');
            const updated = await guildConfigService.setConfigManagerRole(guildId, role, action === 'add');
            const list = updated.length > 0 ? updated.map(id => `<@&${id}>`).join(', ') : 'Nenhum';
            const verb = action === 'add' ? 'adicionado' : 'removido';
            return interaction.editReply({
                content: `✅ Cargo ${role} **${verb}** como gestor de configurações.\nGestores atuais: ${list}`,
            });
        }
    },
};
