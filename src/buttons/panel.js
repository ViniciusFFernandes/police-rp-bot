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
const userRepo            = require('../repositories/userRepository');
const officialProfileRepo = require('../repositories/officialProfileRepository');
const officialWeaponRepo  = require('../repositories/officialWeaponRepository');
const weaponRepo          = require('../repositories/weaponRepository');
const shiftRepo           = require('../repositories/shiftRepository');
const guildConfigRepo     = require('../repositories/guildConfigRepository');
const pendingSR                = require('../utils/pendingSR');
const pendingSRFilter          = require('../utils/pendingSRFilter');
const { openCompositionScreen } = require('../utils/openCompositionScreen');
const { isSupervisor, isAdmin } = require('../utils/permissions');
const { formatTimestamp } = require('../utils/time');
const { COLOR }           = require('../utils/embeds');
const logger              = require('../utils/logger');

const SR_TYPE_OPTIONS = [
    { label: '🟦 Relatório de Ocorrência',   value: 'ocorrencia',          description: 'Ocorrências atendidas em campo' },
    { label: '🟩 Relatório de Prisão/Captura', value: 'prisao',            description: 'Registro de prisão ou captura de suspeito' },
    { label: '🟥 Crime Não Resolvido',         value: 'crime_nao_resolvido', description: 'Crime em aberto / em investigação' },
];

const SR_STATUS_OPTIONS = [
    { label: '🟡 Em Análise', value: 'em_analise' },
    { label: '🔵 Finalizado', value: 'finalizado' },
    { label: '🟢 Resolvido',  value: 'resolvido' },
    { label: '⚫ Arquivado',  value: 'arquivado' },
];

module.exports = {
    customId: 'panel',

    async execute(interaction) {
        const [, action] = interaction.customId.split(':');

        try {
            if (action === 'weapon_register') {
                const elevated = isAdmin(interaction.member) || await isSupervisor(interaction.member);
                if (elevated) {
                    return interaction.reply({
                        content: 'Selecione o oficial que receberá a arma:',
                        components: [
                            new ActionRowBuilder().addComponents(
                                new UserSelectMenuBuilder()
                                    .setCustomId('panel:weapon_register_user')
                                    .setPlaceholder('Selecione o oficial')
                            ),
                        ],
                        ephemeral: true,
                    });
                }

                const modal = new ModalBuilder()
                    .setCustomId('modal:panel_weapon_register')
                    .setTitle('Registrar Arma no Arsenal');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('weapon_name')
                            .setLabel('Nome / Tipo da Arma')
                            .setPlaceholder('ex: Glock 17, AR-15')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(100)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('serial_number')
                            .setLabel('Número de Série')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(50)
                    ),
                );
                return interaction.showModal(modal);
            }

            if (action === 'weapon_register_user') {
                const targetId = interaction.values[0];
                const modal = new ModalBuilder()
                    .setCustomId(`modal:panel_weapon_register:${targetId}`)
                    .setTitle('Registrar Arma no Arsenal');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('weapon_name')
                            .setLabel('Nome / Tipo da Arma')
                            .setPlaceholder('ex: Glock 17, AR-15')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(100)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('serial_number')
                            .setLabel('Número de Série')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(50)
                    ),
                );
                return interaction.showModal(modal);
            }

            if (action === 'weapon_loss') {
                // Supervisores/admins informam o número de série manualmente
                if (isAdmin(interaction.member) || await isSupervisor(interaction.member)) {
                    const modal = new ModalBuilder()
                        .setCustomId('modal:panel_weapon_loss')
                        .setTitle('Registrar Extravio de Arma');

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('serial_number')
                                .setLabel('Número de Série da Arma')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setMaxLength(50)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('observation')
                                .setLabel('Observação (opcional)')
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(false)
                                .setMaxLength(300)
                        ),
                    );
                    return interaction.showModal(modal);
                }

                // Oficial comum: exibe select menu com suas próprias armas ativas
                await interaction.deferReply({ ephemeral: true });

                const dbUser  = await userRepo.findByDiscordId(interaction.user.id);
                const weapons = dbUser
                    ? await officialWeaponRepo.findByUser(dbUser.id, interaction.guildId, { excludeLost: true })
                    : [];

                if (weapons.length === 0) {
                    return interaction.editReply({
                        content: '⚠️ Você não possui armas ativas no arsenal para extraviar.',
                    });
                }

                const select = new StringSelectMenuBuilder()
                    .setCustomId('panel:weapon_loss_select')
                    .setPlaceholder('Selecione a arma extraviada')
                    .addOptions(
                        weapons.map(w => ({
                            label: w.weapon_name.slice(0, 100),
                            description: `Série: ${w.serial_number}`,
                            value: w.serial_number,
                        }))
                    );

                return interaction.editReply({
                    content: '⚠️ Selecione a arma extraviada:',
                    components: [new ActionRowBuilder().addComponents(select)],
                });
            }

            if (action === 'weapon_loss_select') {
                const serial = interaction.values[0];

                const modal = new ModalBuilder()
                    .setCustomId(`modal:panel_weapon_loss_officer:${serial}`)
                    .setTitle('Extravio de Arma — Observação');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('observation')
                            .setLabel('Motivo / Observação (opcional)')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(300)
                    ),
                );
                return interaction.showModal(modal);
            }

            if (action === 'weapon_arsenal') {
                await interaction.deferReply({ ephemeral: true });

                const dbUser  = await userRepo.findByDiscordId(interaction.user.id);
                const weapons = dbUser
                    ? await officialWeaponRepo.findByUser(dbUser.id, interaction.guildId, { excludeLost: true })
                    : [];

                if (weapons.length === 0) {
                    return interaction.editReply({
                        content: 'Você não possui armas ativas no arsenal. Use o botão **Registrar Arma** para adicionar.',
                    });
                }

                const statusLabel = { available: '🟢 Disponível', in_use: '🔵 Em Uso' };
                const embed = new EmbedBuilder()
                    .setColor(COLOR.INFO)
                    .setTitle(`🗄️ Arsenal — ${interaction.member.displayName}`)
                    .setDescription(
                        weapons.map(w =>
                            `${statusLabel[w.status] ?? '⚪'} **${w.weapon_name}** — \`${w.serial_number}\``
                        ).join('\n')
                    )
                    .setFooter({ text: `${weapons.length} arma(s) ativa(s)` })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            if (action === 'start_shift') {
                await interaction.deferReply({ ephemeral: true });
                return openCompositionScreen(interaction);
            }

            if (action === 'end_shift') {
                const dbUser = await userRepo.findByDiscordId(interaction.user.id);
                const shift  = dbUser ? await shiftRepo.findActiveByUser(dbUser.id, interaction.guildId) : null;

                if (!shift) {
                    return interaction.reply({ content: '❌ Você não possui um turno ativo no momento.', ephemeral: true });
                }

                const reasonSelect = new StringSelectMenuBuilder()
                    .setCustomId(`shiftend:reason:${interaction.user.id}`)
                    .setPlaceholder('Selecione o motivo do encerramento')
                    .addOptions(
                        { label: 'Fim de Patrulha', value: 'patrol_end', emoji: '🏁' },
                        { label: 'Remodulação', value: 'remodulation', emoji: '🔄', description: 'Encerra e permite iniciar uma nova unidade' },
                        { label: 'Outro', value: 'other', emoji: '📝', description: 'Informar um motivo personalizado' },
                    );

                return interaction.reply({
                    content: '📕 **Encerramento de Turno** — qual o motivo?',
                    components: [new ActionRowBuilder().addComponents(reasonSelect)],
                    ephemeral: true,
                });
            }

            if (action === 'open_report') {
                pendingSR.clear(interaction.guildId, interaction.user.id);

                const typeSelect = new StringSelectMenuBuilder()
                    .setCustomId('sr:type')
                    .setPlaceholder('Selecione o tipo de relatório')
                    .addOptions(SR_TYPE_OPTIONS);

                const officersSelect = new UserSelectMenuBuilder()
                    .setCustomId('sr:officers')
                    .setPlaceholder('Outros oficiais envolvidos (opcional)')
                    .setMinValues(0)
                    .setMaxValues(10);

                const nextBtn = new ButtonBuilder()
                    .setCustomId('sr:step2')
                    .setLabel('Continuar →')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋');

                const embed = new EmbedBuilder()
                    .setColor(COLOR.INFO)
                    .setTitle('📋 Novo Relatório de Serviço')
                    .setDescription(
                        '**Etapa 1 de 2** — Identificação\n\n' +
                        `Você (<@${interaction.user.id}>) será o **responsável** pelo relatório.\n\n` +
                        'Selecione o **tipo** de relatório e, se houver, outros oficiais envolvidos.\n' +
                        'Clique em **Continuar** quando estiver pronto.'
                    );

                return interaction.reply({
                    embeds: [embed],
                    components: [
                        new ActionRowBuilder().addComponents(typeSelect),
                        new ActionRowBuilder().addComponents(officersSelect),
                        new ActionRowBuilder().addComponents(nextBtn),
                    ],
                    ephemeral: true,
                });
            }

            if (action === 'list_reports') {
                pendingSRFilter.clear(interaction.guildId, interaction.user.id);

                const typeSelect = new StringSelectMenuBuilder()
                    .setCustomId('sr:list_type')
                    .setPlaceholder('Filtrar por tipo (opcional)')
                    .addOptions(SR_TYPE_OPTIONS);

                const involvedSelect = new UserSelectMenuBuilder()
                    .setCustomId('sr:list_involved')
                    .setPlaceholder('Filtrar por envolvido (opcional)');

                const statusSelect = new StringSelectMenuBuilder()
                    .setCustomId('sr:list_status')
                    .setPlaceholder('Filtrar por situação (opcional)')
                    .addOptions(SR_STATUS_OPTIONS);

                const searchBtn = new ButtonBuilder()
                    .setCustomId('sr:list_search')
                    .setLabel('Buscar')
                    .setEmoji('🔎')
                    .setStyle(ButtonStyle.Primary);

                const embed = new EmbedBuilder()
                    .setColor(COLOR.INFO)
                    .setTitle('🔎 Consultar Relatórios de Serviço')
                    .setDescription(
                        'Todos os filtros abaixo são **opcionais** — escolha quantos quiser e clique em **Buscar**.\n' +
                        'Se nenhum filtro for selecionado, todos os relatórios serão listados.'
                    );

                return interaction.reply({
                    embeds: [embed],
                    components: [
                        new ActionRowBuilder().addComponents(typeSelect),
                        new ActionRowBuilder().addComponents(involvedSelect),
                        new ActionRowBuilder().addComponents(statusSelect),
                        new ActionRowBuilder().addComponents(searchBtn),
                    ],
                    ephemeral: true,
                });
            }

            if (action === 'traffic_warning_register') {
                const step1 = require('../modals/trafficWarningStep1Modal');
                return interaction.showModal(step1.build());
            }

            if (action === 'traffic_warning_search') {
                const searchModal = require('../modals/trafficWarningSearchModal');
                return interaction.showModal(searchModal.build());
            }

            if (action === 'profile_view') {
                await interaction.deferReply({ ephemeral: true });

                const profile = await officialProfileRepo.findByDiscordId(
                    interaction.user.id,
                    interaction.guildId
                );

                if (!profile) {
                    return interaction.editReply({
                        content: '⚠️ Você ainda não possui perfil configurado. Solicite a um supervisor.',
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor(COLOR.INFO)
                    .setTitle(`👮 Perfil Operacional — ${interaction.member.displayName}`)
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .addFields(
                        { name: '📍 Distrito',   value: profile.district,     inline: true },
                        { name: '📟 Callsign',   value: profile.callsign_num.padStart(3, '0'), inline: true },
                        { name: '🪪 Distintivo', value: profile.badge_num ? profile.badge_num.padStart(4, '0') : '—', inline: true },
                        { name: '👤 Nome',       value: profile.display_name || '—', inline: true },
                        { name: '🕐 Atualizado', value: formatTimestamp(profile.updated_at), inline: true },
                    )
                    .setFooter({ text: interaction.guild.name })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }
        } catch (err) {
            logger.error('Erro no painel operacional', { action, guild: interaction.guildId, error: err.message });
            const reply = { content: '❌ Ocorreu um erro. Tente novamente.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};
