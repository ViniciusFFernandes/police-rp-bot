const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const shiftService = require('../services/shiftService');
const userRepo = require('../repositories/userRepository');
const shiftRepo = require('../repositories/shiftRepository');
const { canManageShift } = require('../utils/permissions');
const logger = require('../utils/logger');

async function resolveShift(interaction) {
    // Prioriza o turno vinculado à embed onde o botão foi clicado.
    // Isso evita que um supervisor em turno ativo acidentalmente feche o seu
    // próprio turno ao clicar nos botões da embed de outro oficial.
    const managed = await shiftRepo.findByEmbedMessage(interaction.message.id, interaction.guildId);
    if (managed) {
        const allowed = await canManageShift(interaction, managed.user_discord_id);
        if (!allowed) return { error: 'Você não tem permissão para gerenciar este turno.' };
        return { shift: managed, ownerDiscordId: managed.user_discord_id };
    }

    // Fallback: embed sem turno vinculado (ex: embed_message_id não gravado).
    // Nesse caso usa o turno ativo do próprio usuário.
    const dbUser = await userRepo.findByDiscordId(interaction.user.id);
    if (dbUser) {
        const shift = await shiftRepo.findActiveByUser(dbUser.id, interaction.guildId);
        if (shift) return { shift, ownerDiscordId: interaction.user.id };
    }

    return { error: 'Nenhum turno ativo vinculado a esta mensagem.' };
}

module.exports = {
    customId: 'shift',

    async execute(interaction) {
        const [, action] = interaction.customId.split(':');

        try {
            // Modais não precisam de resolveShift — são tratados pelos modal handlers
            if (action === 'weapon_loss') {
                const modal = new ModalBuilder()
                    .setCustomId('modal:weapon_loss')
                    .setTitle('Registrar Extravio de Armamento');

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
                            .setMaxLength(500)
                    ),
                );
                return await interaction.showModal(modal);
            }

            if (action === 'add_weapon') {
                const modal = new ModalBuilder()
                    .setCustomId('modal:add_weapon')
                    .setTitle('Adicionar Arma ao Turno');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('weapon_name')
                            .setLabel('Nome/Tipo da Arma (ex: Glock 17)')
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
                return await interaction.showModal(modal);
            }

            // Para ações que alteram estado do turno, resolve o dono primeiro
            await interaction.deferUpdate();

            const resolved = await resolveShift(interaction);
            if (resolved.error) {
                return interaction.followUp({ content: `❌ ${resolved.error}`, ephemeral: true });
            }

            const { ownerDiscordId } = resolved;

            // Encerramento agora pede o MOTIVO antes de concluir
            if (action === 'end') {
                const reasonSelect = new StringSelectMenuBuilder()
                    .setCustomId(`shiftend:reason:${ownerDiscordId}`)
                    .setPlaceholder('Selecione o motivo do encerramento')
                    .addOptions(
                        { label: 'Fim de Patrulha', value: 'patrol_end', emoji: '🏁' },
                        { label: 'Remodulação', value: 'remodulation', emoji: '🔄', description: 'Encerra e permite iniciar uma nova unidade' },
                        { label: 'Outro', value: 'other', emoji: '📝', description: 'Informar um motivo personalizado' },
                    );

                return interaction.followUp({
                    content: '📕 **Encerramento de Turno** — qual o motivo?',
                    components: [new ActionRowBuilder().addComponents(reasonSelect)],
                    ephemeral: true,
                });
            }

            const actionMap = {
                pause:  { fn: () => shiftService.pauseShift(interaction, ownerDiscordId),  msg: '⏸️ Turno pausado.' },
                resume: { fn: () => shiftService.resumeShift(interaction, ownerDiscordId), msg: '▶️ Retornando ao serviço.' },
            };

            const op = actionMap[action];
            if (!op) return;

            const result = await op.fn();
            if (result.error) {
                return interaction.followUp({ content: `❌ ${result.error}`, ephemeral: true });
            }
            await interaction.followUp({ content: op.msg, ephemeral: true });

        } catch (err) {
            logger.error('Erro no handler de botão de turno', { action, guild: interaction.guildId, error: err.message });
            const reply = { content: '❌ Erro interno. Tente novamente.', ephemeral: true };
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(reply);
            } else {
                await interaction.followUp(reply);
            }
        }
    },
};
