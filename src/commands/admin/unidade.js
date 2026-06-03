const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const unitRepo = require('../../repositories/unitRepository');
const { COLOR } = require('../../utils/embeds');

const MAX_UNITS = 25;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unidade')
        .setDescription('Gerencia as unidades operacionais disponíveis para os turnos')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('registrar')
                .setDescription('Cadastra uma nova unidade (ex: A, L, K, E, RPM)')
                .addStringOption(opt =>
                    opt.setName('nome')
                        .setDescription('Sigla ou nome da unidade (ex: A, L, RPM, AIR)')
                        .setRequired(true)
                        .setMaxLength(20)
                )
        )
        .addSubcommand(sub =>
            sub.setName('listar')
                .setDescription('Exibe todas as unidades cadastradas')
        )
        .addSubcommand(sub =>
            sub.setName('remover')
                .setDescription('Remove uma unidade do cadastro')
                .addStringOption(opt =>
                    opt.setName('nome')
                        .setDescription('Nome exato da unidade a remover')
                        .setRequired(true)
                        .setMaxLength(20)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        // ── /unidade registrar ─────────────────────────────────────
        if (sub === 'registrar') {
            const name = interaction.options.getString('nome').trim().toUpperCase();

            const existing = await unitRepo.findActive(guildId);
            if (existing.length >= MAX_UNITS) {
                return interaction.editReply({
                    content: `❌ Limite de **${MAX_UNITS} unidades** atingido. Remova alguma antes de cadastrar uma nova.`,
                });
            }

            await unitRepo.register(guildId, name);
            return interaction.editReply({
                content: `✅ Unidade **${name}** cadastrada com sucesso. Ela estará disponível na seleção ao iniciar um turno.`,
            });
        }

        // ── /unidade listar ────────────────────────────────────────
        if (sub === 'listar') {
            const units = await unitRepo.findAll(guildId);

            if (units.length === 0) {
                return interaction.editReply({
                    content:
                        'Nenhuma unidade cadastrada. Use `/unidade registrar` para adicionar.\n' +
                        '> Sem unidades cadastradas, o oficial digita a unidade manualmente ao iniciar o turno.',
                });
            }

            const active   = units.filter(u => u.is_active);
            const inactive = units.filter(u => !u.is_active);

            const embed = new EmbedBuilder()
                .setColor(COLOR.INFO)
                .setTitle('🏢 Unidades Operacionais Cadastradas')
                .setFooter({ text: `${active.length} ativa(s) · ${inactive.length} desativada(s) · ${interaction.guild.name}` })
                .setTimestamp();

            if (active.length > 0) {
                embed.addFields({
                    name: '🟢 Disponíveis',
                    value: active.map(u => `• **${u.name}**`).join('\n'),
                    inline: true,
                });
            }

            if (inactive.length > 0) {
                embed.addFields({
                    name: '🔴 Desativadas',
                    value: inactive.map(u => `• ~~${u.name}~~`).join('\n'),
                    inline: true,
                });
            }

            return interaction.editReply({ embeds: [embed] });
        }

        // ── /unidade remover ───────────────────────────────────────
        if (sub === 'remover') {
            const name = interaction.options.getString('nome').trim().toUpperCase();
            const removed = await unitRepo.deactivate(guildId, name);

            if (!removed) {
                return interaction.editReply({
                    content: `❌ Unidade **${name}** não encontrada no cadastro.`,
                });
            }

            return interaction.editReply({
                content: `✅ Unidade **${name}** removida. Ela não aparecerá mais na seleção de turnos.\n> Turnos anteriores que usaram essa unidade não são afetados.`,
            });
        }
    },
};
