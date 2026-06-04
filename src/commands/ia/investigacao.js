const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    EmbedBuilder,
} = require('discord.js');
const { isIAStaff, isAdmin, isSupervisor } = require('../../utils/permissions');
const pendingIA = require('../../utils/pendingIA');
const { COLOR } = require('../../utils/embeds');

const ORIGIN_OPTIONS = [
    { label: '🟦 Civil (Pública)',              value: 'civil',    description: 'Denúncia feita por civil externo' },
    { label: '🟥 Interna (Blue-on-Blue)',        value: 'internal', description: 'Denúncia feita por outro policial' },
    { label: '⬛ Uso de Força Crítico (OIS)',    value: 'ois',      description: 'Officer-Involved Shooting' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ia')
        .setDescription('Assuntos Internos — gerencia investigações internas')
        .addSubcommand(sub =>
            sub.setName('abrir')
                .setDescription('Abre uma nova investigação interna')
        )
        .addSubcommand(sub =>
            sub.setName('listar')
                .setDescription('Lista investigações abertas neste servidor')
        )
        .addSubcommand(sub =>
            sub.setName('deletar')
                .setDescription('Deleta permanentemente uma investigação (somente admins e supervisores)')
                .addStringOption(opt =>
                    opt.setName('numero')
                        .setDescription('Número do caso (ex: IA-2026-001)')
                        .setRequired(true)
                        .setMaxLength(30)
                )
        ),

    async execute(interaction) {
        if (!await isIAStaff(interaction.member)) {
            return interaction.reply({
                content: '❌ Apenas **Administradores**, **Supervisores** e membros de **Assuntos Internos** podem gerenciar investigações.',
                ephemeral: true,
            });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'abrir') {
            pendingIA.clear(interaction.guildId, interaction.user.id);

            const originSelect = new StringSelectMenuBuilder()
                .setCustomId('ia:origin')
                .setPlaceholder('Selecione a origem da investigação')
                .addOptions(ORIGIN_OPTIONS);

            const officerSelect = new UserSelectMenuBuilder()
                .setCustomId('ia:involved')
                .setPlaceholder('Selecione o oficial acusado/envolvido');

            const nextBtn = new ButtonBuilder()
                .setCustomId('ia:step2')
                .setLabel('Continuar →')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋');

            const embed = new EmbedBuilder()
                .setColor(COLOR.INFO)
                .setTitle('🔍 Nova Investigação Interna')
                .setDescription(
                    '**Etapa 1 de 3** — Identificação\n\n' +
                    'Selecione a **origem** da investigação e o **oficial acusado/envolvido**.\n' +
                    'Clique em **Continuar** quando estiver pronto.'
                );

            return interaction.reply({
                embeds: [embed],
                components: [
                    new ActionRowBuilder().addComponents(originSelect),
                    new ActionRowBuilder().addComponents(officerSelect),
                    new ActionRowBuilder().addComponents(nextBtn),
                ],
                ephemeral: true,
            });
        }

        if (sub === 'deletar') {
            if (!isAdmin(interaction.member) && !await isSupervisor(interaction.member)) {
                return interaction.reply({
                    content: '❌ Apenas **Administradores** e **Supervisores** podem deletar investigações.',
                    ephemeral: true,
                });
            }

            const iaRepo     = require('../../repositories/iaRepository');
            const caseNumber = interaction.options.getString('numero').trim();
            const inv        = await iaRepo.findByCaseNumber(caseNumber, interaction.guildId);

            if (!inv) {
                return interaction.reply({
                    content: `❌ Investigação **${caseNumber}** não encontrada neste servidor.`,
                    ephemeral: true,
                });
            }

            // Tenta remover a mensagem do quadro no canal de IA
            if (inv.board_message_id && inv.board_channel_id) {
                const ch = interaction.guild.channels.cache.get(inv.board_channel_id);
                if (ch) {
                    const msg = await ch.messages.fetch(inv.board_message_id).catch(() => null);
                    if (msg) await msg.delete().catch(() => {});
                }
            }

            await iaRepo.remove(inv.id, interaction.guildId);

            return interaction.reply({
                content: `🗑️ Investigação **${inv.case_number}** deletada permanentemente.`,
                ephemeral: true,
            });
        }

        if (sub === 'listar') {
            const iaRepo = require('../../repositories/iaRepository');
            const cases  = await iaRepo.listByGuild(interaction.guildId);

            if (cases.length === 0) {
                return interaction.reply({ content: '📂 Nenhuma investigação encontrada neste servidor.', ephemeral: true });
            }

            const STATUS_ICON = { active: '🟢', suspended: '🟡', closed: '🔴' };
            const lines = cases.map(c =>
                `${STATUS_ICON[c.status] || '⚪'} **${c.case_number}** — <@${c.involved_discord_id}> — ${c.classification || '—'}`
            );

            const embed = new EmbedBuilder()
                .setColor(COLOR.INFO)
                .setTitle('📂 Investigações Internas')
                .setDescription(lines.join('\n').slice(0, 4000))
                .setFooter({ text: `${cases.length} investigação(ões) encontrada(s)` })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
