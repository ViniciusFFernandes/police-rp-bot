const {
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const iaRepo          = require('../repositories/iaRepository');
const iaService       = require('../services/iaService');
const pendingIA       = require('../utils/pendingIA');
const pendingMeasure  = require('../utils/pendingMeasure');
const { isIAStaff, isAdmin, isSupervisor } = require('../utils/permissions');
const { COLOR }  = require('../utils/embeds');
const logger     = require('../utils/logger');

const ORIGIN_OPTIONS = [
    { label: '🟦 Civil (Pública)',           value: 'civil',    description: 'Denúncia feita por civil externo' },
    { label: '🟥 Interna (Blue-on-Blue)',     value: 'internal', description: 'Denúncia feita por outro policial' },
    { label: '⬛ Uso de Força Crítico (OIS)', value: 'ois',      description: 'Officer-Involved Shooting' },
];

module.exports = {
    customId: 'iapanel',

    async execute(interaction) {
        const [, action] = interaction.customId.split(':');

        try {
            if (!await isIAStaff(interaction.member)) {
                const reply = { content: '❌ Acesso restrito à equipe de **Assuntos Internos**.', ephemeral: true };
                if (interaction.replied || interaction.deferred) return interaction.followUp(reply);
                return interaction.reply(reply);
            }

            // ── Abrir investigação ────────────────────────────────────
            if (action === 'open') {
                pendingIA.clear(interaction.guildId, interaction.user.id);

                const originSelect = new StringSelectMenuBuilder()
                    .setCustomId('ia:origin')
                    .setPlaceholder('Selecione a origem da investigação')
                    .addOptions(ORIGIN_OPTIONS);

                const officerSelect = new UserSelectMenuBuilder()
                    .setCustomId('ia:involved')
                    .setPlaceholder('Selecione o(s) oficial(is) acusado(s)/envolvido(s)')
                    .setMinValues(1)
                    .setMaxValues(10);

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
                        'Selecione a **origem** da investigação e o(s) **oficial(is) acusado(s)/envolvido(s)**.\n' +
                        'Você pode selecionar até 10 oficiais. Clique em **Continuar** quando estiver pronto.'
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

            // ── Listar — passo 1: escolher filtro ────────────────────
            if (action === 'list') {
                const userSelect = new UserSelectMenuBuilder()
                    .setCustomId('iapanel:list_filter')
                    .setPlaceholder('Filtrar por oficial (opcional)');

                const allBtn = new ButtonBuilder()
                    .setCustomId('iapanel:list_all')
                    .setLabel('Listar Todas')
                    .setStyle(ButtonStyle.Secondary);

                return interaction.reply({
                    content: 'Selecione um oficial para filtrar ou clique em **Listar Todas**:',
                    components: [
                        new ActionRowBuilder().addComponents(userSelect),
                        new ActionRowBuilder().addComponents(allBtn),
                    ],
                    ephemeral: true,
                });
            }

            // ── Listar — com filtro de oficial ────────────────────────
            if (action === 'list_filter') {
                await interaction.deferUpdate();
                const targetId = interaction.values[0];
                return renderList(interaction, targetId);
            }

            // ── Listar — todas ────────────────────────────────────────
            if (action === 'list_all') {
                await interaction.deferUpdate();
                return renderList(interaction, null);
            }

            // ── Ver investigação — abre modal com número do caso ──────
            if (action === 'view') {
                const modal = new ModalBuilder()
                    .setCustomId('modal:iapanel_view')
                    .setTitle('Ver Investigação');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('case_number')
                            .setLabel('Número do Caso (ex: IA-2026-001)')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(30)
                    ),
                );
                return interaction.showModal(modal);
            }

            // ── Aplicar Medida — passo 1: selecionar oficial ─────────
            if (action === 'measure') {
                pendingMeasure.clear(interaction.guildId, interaction.user.id);
                return interaction.reply({
                    content: 'Selecione o oficial que receberá a medida:',
                    components: [
                        new ActionRowBuilder().addComponents(
                            new UserSelectMenuBuilder()
                                .setCustomId('iapanel:measure_user')
                                .setPlaceholder('Selecione o oficial')
                        ),
                    ],
                    ephemeral: true,
                });
            }

            // ── Aplicar Medida — passo 2: tipo + entrega de arma ─────
            if (action === 'measure_user') {
                const targetId = interaction.values[0];
                pendingMeasure.set(interaction.guildId, interaction.user.id, { targetId, type: null, weaponSurrender: 'no' });

                const typeSelect = new StringSelectMenuBuilder()
                    .setCustomId('iapanel:measure_type')
                    .setPlaceholder('Selecione o tipo de medida')
                    .addOptions([
                        { label: '⚠️ Punição',       value: 'punishment', description: 'Advertência, suspensão de função, etc.' },
                        { label: '🚫 Afastamento',    value: 'suspension', description: 'Afastamento temporário do oficial' },
                        { label: '📋 Outra Medida',   value: 'other',      description: 'Outra medida disciplinar ou administrativa' },
                    ]);

                const weaponSelect = new StringSelectMenuBuilder()
                    .setCustomId('iapanel:measure_weapon')
                    .setPlaceholder('Entrega de armamento necessária?')
                    .addOptions([
                        { label: '❌ Não — armamento permanece com o oficial', value: 'no' },
                        { label: '✅ Sim — oficial deve entregar armamento',   value: 'yes' },
                    ]);

                const continueBtn = new ButtonBuilder()
                    .setCustomId('iapanel:measure_step2')
                    .setLabel('Continuar →')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚖️');

                return interaction.update({
                    content: `Oficial selecionado: <@${targetId}>\n\nDefina o tipo de medida e se há entrega de armamento:`,
                    components: [
                        new ActionRowBuilder().addComponents(typeSelect),
                        new ActionRowBuilder().addComponents(weaponSelect),
                        new ActionRowBuilder().addComponents(continueBtn),
                    ],
                });
            }

            // ── Aplicar Medida — seleção de tipo ─────────────────────
            if (action === 'measure_type') {
                pendingMeasure.set(interaction.guildId, interaction.user.id, { type: interaction.values[0] });
                return interaction.deferUpdate();
            }

            // ── Aplicar Medida — seleção de entrega de arma ──────────
            if (action === 'measure_weapon') {
                pendingMeasure.set(interaction.guildId, interaction.user.id, { weaponSurrender: interaction.values[0] });
                return interaction.deferUpdate();
            }

            // ── Aplicar Medida — passo 3: modal com duração + descrição
            if (action === 'measure_step2') {
                const pending = pendingMeasure.get(interaction.guildId, interaction.user.id);
                if (!pending?.type) {
                    return interaction.reply({ content: '❌ Selecione o tipo de medida antes de continuar.', ephemeral: true });
                }

                const modal = new ModalBuilder()
                    .setCustomId(`modal:iapanel_measure:${pending.targetId}`)
                    .setTitle('Medida Disciplinar — Detalhes');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('duration')
                            .setLabel('Duração / Prazo (ex: 3 dias, 1 semana)')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(pending.type === 'suspension')
                            .setMaxLength(100)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('description')
                            .setLabel('Descrição / Motivo da medida')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                            .setMaxLength(1000)
                    ),
                );
                return interaction.showModal(modal);
            }

            // ── Deletar — apenas supervisores/admins ──────────────────
            if (action === 'delete') {
                if (!isAdmin(interaction.member) && !await isSupervisor(interaction.member)) {
                    return interaction.reply({
                        content: '❌ Apenas **Administradores** e **Supervisores** podem deletar investigações.',
                        ephemeral: true,
                    });
                }

                const modal = new ModalBuilder()
                    .setCustomId('modal:iapanel_delete')
                    .setTitle('Deletar Investigação');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('case_number')
                            .setLabel('Número do Caso (ex: IA-2026-001)')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(30)
                    ),
                );
                return interaction.showModal(modal);
            }
        } catch (err) {
            logger.error('Erro no painel de IA', { action, guild: interaction.guildId, error: err.message });
            const reply = { content: '❌ Ocorreu um erro. Tente novamente.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};

async function renderList(interaction, involvedDiscordId) {
    const cases = await iaRepo.listByGuild(interaction.guildId, { involvedDiscordId });

    const titulo = involvedDiscordId
        ? `📂 Investigações — Envolvido: <@${involvedDiscordId}>`
        : '📂 Investigações Internas';

    if (cases.length === 0) {
        const msg = involvedDiscordId
            ? `📂 Nenhuma investigação encontrada para <@${involvedDiscordId}>.`
            : '📂 Nenhuma investigação encontrada neste servidor.';
        return interaction.editReply({ content: msg, components: [] });
    }

    const STATUS_ICON = { active: '🟢', suspended: '🟡', closed: '🔴' };
    const lines = cases.map(c =>
        `${STATUS_ICON[c.status] || '⚪'} **${c.case_number}** — <@${c.involved_discord_id}> — ${c.classification || '—'}`
    );

    const embed = new EmbedBuilder()
        .setColor(COLOR.INFO)
        .setTitle(titulo)
        .setDescription(lines.join('\n').slice(0, 4000))
        .setFooter({ text: `${cases.length} investigação(ões) encontrada(s) · ${interaction.guild.name}` })
        .setTimestamp();

    return interaction.editReply({ embeds: [embed], components: [] });
}
