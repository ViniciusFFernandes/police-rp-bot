const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const vehicleRepo = require('../../repositories/vehicleRepository');
const { COLOR } = require('../../utils/embeds');

const MAX_VEHICLES = 25;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('veiculo')
        .setDescription('Gerencia o cadastro de viaturas disponíveis para os turnos')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('registrar')
                .setDescription('Cadastra uma nova viatura')
                .addStringOption(opt =>
                    opt.setName('nome')
                        .setDescription('Nome da viatura (ex: Ford Explorer, Tesla Model Y)')
                        .setRequired(true)
                        .setMaxLength(100)
                )
        )
        .addSubcommand(sub =>
            sub.setName('listar')
                .setDescription('Exibe todas as viaturas cadastradas')
        )
        .addSubcommand(sub =>
            sub.setName('remover')
                .setDescription('Remove uma viatura do cadastro')
                .addStringOption(opt =>
                    opt.setName('nome')
                        .setDescription('Nome exato da viatura a remover')
                        .setRequired(true)
                        .setMaxLength(100)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        // ── /veiculo registrar ─────────────────────────────────────
        if (sub === 'registrar') {
            const name = interaction.options.getString('nome').trim();

            const existing = await vehicleRepo.findActive(guildId);
            if (existing.length >= MAX_VEHICLES) {
                return interaction.editReply({
                    content: `❌ Limite de **${MAX_VEHICLES} viaturas** atingido. Remova alguma antes de cadastrar uma nova.`,
                });
            }

            await vehicleRepo.register(guildId, name);
            return interaction.editReply({
                content: `✅ Viatura **${name}** cadastrada com sucesso. Ela estará disponível na seleção ao iniciar um turno.`,
            });
        }

        // ── /veiculo listar ────────────────────────────────────────
        if (sub === 'listar') {
            const vehicles = await vehicleRepo.findAll(guildId);

            if (vehicles.length === 0) {
                return interaction.editReply({
                    content: 'Nenhuma viatura cadastrada. Use `/veiculo registrar` para adicionar.',
                });
            }

            const active   = vehicles.filter(v => v.is_active);
            const inactive = vehicles.filter(v => !v.is_active);

            const embed = new EmbedBuilder()
                .setColor(COLOR.INFO)
                .setTitle('🚗 Viaturas Cadastradas')
                .setFooter({ text: `${active.length} ativa(s) · ${inactive.length} desativada(s) · ${interaction.guild.name}` })
                .setTimestamp();

            if (active.length > 0) {
                embed.addFields({
                    name: '🟢 Disponíveis',
                    value: active.map(v => `• ${v.name}`).join('\n'),
                    inline: false,
                });
            }

            if (inactive.length > 0) {
                embed.addFields({
                    name: '🔴 Desativadas',
                    value: inactive.map(v => `• ~~${v.name}~~`).join('\n'),
                    inline: false,
                });
            }

            return interaction.editReply({ embeds: [embed] });
        }

        // ── /veiculo remover ───────────────────────────────────────
        if (sub === 'remover') {
            const name = interaction.options.getString('nome').trim();
            const removed = await vehicleRepo.deactivate(guildId, name);

            if (!removed) {
                return interaction.editReply({
                    content: `❌ Viatura **${name}** não encontrada no cadastro.`,
                });
            }

            return interaction.editReply({
                content: `✅ Viatura **${name}** removida. Ela não aparecerá mais na seleção de turnos.\n> Turnos anteriores que usaram essa viatura não são afetados.`,
            });
        }
    },
};
