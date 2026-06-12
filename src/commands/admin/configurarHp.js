const {
    SlashCommandBuilder,
    ChannelType,
} = require('discord.js');
const guildConfigRepo     = require('../../repositories/guildConfigRepository');
const hpPanelService      = require('../../services/hpPanelService');
const hpAdminPanelService = require('../../services/hpAdminPanelService');
const { isConfigManager } = require('../../utils/permissions');

async function deleteOldMessage(guild, messageIdKey) {
    try {
        const msgId = await guildConfigRepo.get(guild.id, messageIdKey);
        if (!msgId) return;
        for (const channel of guild.channels.cache.values()) {
            if (channel.type !== 0) continue;
            try { const msg = await channel.messages.fetch(msgId); await msg.delete(); return; } catch { /* continua */ }
        }
    } catch { /* silencioso */ }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar-hp')
        .setDescription('Configura o módulo do Hospital')
        .addSubcommand(sub =>
            sub.setName('canal-painel')
                .setDescription('Canal onde o painel operacional do hospital é publicado')
                .addChannelOption(opt =>
                    opt.setName('canal').setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText).setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-admin')
                .setDescription('Canal onde o painel administrativo do hospital é publicado')
                .addChannelOption(opt =>
                    opt.setName('canal').setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText).setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-turnos')
                .setDescription('Canal onde as embeds de turno do hospital são postadas')
                .addChannelOption(opt =>
                    opt.setName('canal').setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText).setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('canal-relatorios')
                .setDescription('Canal onde os relatórios de turno encerrado do hospital são enviados')
                .addChannelOption(opt =>
                    opt.setName('canal').setDescription('Selecione o canal')
                        .addChannelTypes(ChannelType.GuildText).setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('cargos')
                .setDescription('Cargos que podem usar o painel do hospital (equipe)')
                .addRoleOption(opt => opt.setName('cargo1').setDescription('Cargo 1').setRequired(true))
                .addRoleOption(opt => opt.setName('cargo2').setDescription('Cargo 2 (opcional)').setRequired(false))
                .addRoleOption(opt => opt.setName('cargo3').setDescription('Cargo 3 (opcional)').setRequired(false))
                .addRoleOption(opt => opt.setName('cargo4').setDescription('Cargo 4 (opcional)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('supervisores')
                .setDescription('Cargos de supervisores do hospital (acesso ao painel admin)')
                .addRoleOption(opt => opt.setName('cargo1').setDescription('Cargo 1').setRequired(true))
                .addRoleOption(opt => opt.setName('cargo2').setDescription('Cargo 2 (opcional)').setRequired(false))
                .addRoleOption(opt => opt.setName('cargo3').setDescription('Cargo 3 (opcional)').setRequired(false))
                .addRoleOption(opt => opt.setName('cargo4').setDescription('Cargo 4 (opcional)').setRequired(false))
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!await isConfigManager(interaction.member)) {
            return interaction.editReply({
                content: '❌ Você não tem permissão para usar este comando.\nApenas **Administradores** e **Gestores de Configuração** podem configurar o bot.',
            });
        }

        const sub     = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        // ── Canais ─────────────────────────────────────────────────────────────
        if (sub === 'canal-painel') {
            const channel = interaction.options.getChannel('canal');
            await guildConfigRepo.set(guildId, 'hp_panel_channel_id', channel.id);
            await deleteOldMessage(interaction.guild, 'hp_panel_message_id');
            await guildConfigRepo.set(guildId, 'hp_panel_message_id', null);
            await hpPanelService.refresh(interaction.guild);
            return interaction.editReply({
                content: `✅ **🏥 Canal do Painel HP** configurado para ${channel}.\nO painel do hospital foi publicado nesse canal.`,
            });
        }

        if (sub === 'canal-admin') {
            const channel = interaction.options.getChannel('canal');
            await guildConfigRepo.set(guildId, 'hp_admin_panel_channel_id', channel.id);
            await deleteOldMessage(interaction.guild, 'hp_admin_panel_message_id');
            await guildConfigRepo.set(guildId, 'hp_admin_panel_message_id', null);
            await hpAdminPanelService.refresh(interaction.guild);
            return interaction.editReply({
                content: `✅ **🏥 Canal Admin HP** configurado para ${channel}.\nO painel administrativo do hospital foi publicado nesse canal.`,
            });
        }

        if (sub === 'canal-turnos') {
            const channel = interaction.options.getChannel('canal');
            await guildConfigRepo.set(guildId, 'hp_shift_channel_id', channel.id);
            return interaction.editReply({ content: `✅ **🏥 Canal de Turnos HP** configurado para ${channel}.` });
        }

        if (sub === 'canal-relatorios') {
            const channel = interaction.options.getChannel('canal');
            await guildConfigRepo.set(guildId, 'hp_report_channel_id', channel.id);
            return interaction.editReply({ content: `✅ **🏥 Canal de Relatórios HP** configurado para ${channel}.` });
        }

        // ── Cargos ─────────────────────────────────────────────────────────────
        if (sub === 'cargos') {
            const roles = ['cargo1', 'cargo2', 'cargo3', 'cargo4']
                .map(n => interaction.options.getRole(n)).filter(Boolean);
            await guildConfigRepo.setHpRoles(guildId, roles.map(r => r.id));
            return interaction.editReply({
                content: `✅ **🏥 Cargos da Equipe HP** definidos: ${roles.map(r => `<@&${r.id}>`).join(', ')}`,
            });
        }

        if (sub === 'supervisores') {
            const roles = ['cargo1', 'cargo2', 'cargo3', 'cargo4']
                .map(n => interaction.options.getRole(n)).filter(Boolean);
            await guildConfigRepo.setHpSupervisorRoles(guildId, roles.map(r => r.id));
            return interaction.editReply({
                content: `✅ **🏥 Supervisores HP** definidos: ${roles.map(r => `<@&${r.id}>`).join(', ')}`,
            });
        }
    },
};
