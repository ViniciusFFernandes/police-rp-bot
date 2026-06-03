const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
} = require('discord.js');
const guildConfigService = require('../../services/guildConfigService');
const guildConfigRepo = require('../../repositories/guildConfigRepository');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Configura o bot para este servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
                            { name: 'Remover', value: 'remove' },
                        )
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        const KEY_MAP = {
            'canal-turnos': 'shift_channel_id',
            'canal-relatorios': 'report_channel_id',
            'canal-armamento': 'weapon_report_channel_id',
            'categoria-voz': 'voice_category_id',
        };

        if (KEY_MAP[sub]) {
            const optionName = sub === 'categoria-voz' ? 'categoria' : 'canal';
            const channel = interaction.options.getChannel(optionName);
            const meta = await guildConfigService.setChannel(guildId, KEY_MAP[sub], channel);
            return interaction.editReply({
                content: `✅ **${meta.emoji} ${meta.label}** configurado para ${channel}.`,
            });
        }

        if (sub === 'cargo-supervisor') {
            const role = interaction.options.getRole('cargo');
            const action = interaction.options.getString('acao');
            const updated = await guildConfigService.setRole(guildId, role, action === 'add');
            const list = updated.length > 0 ? updated.map(id => `<@&${id}>`).join(', ') : 'Nenhum';
            const verb = action === 'add' ? 'adicionado' : 'removido';
            return interaction.editReply({
                content: `✅ Cargo ${role} **${verb}**.\nSupervisores atuais: ${list}`,
            });
        }
    },
};
