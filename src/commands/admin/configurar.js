const {
    SlashCommandBuilder,
    ChannelType,
} = require('discord.js');
const guildConfigService    = require('../../services/guildConfigService');
const guildConfigRepo       = require('../../repositories/guildConfigRepository');
const callsignBoardService  = require('../../services/callsignBoardService');
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
        };

        if (KEY_MAP[sub]) {
            const optionName = sub === 'categoria-voz' ? 'categoria' : 'canal';
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
