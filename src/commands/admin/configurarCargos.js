const { SlashCommandBuilder } = require('discord.js');
const guildConfigService = require('../../services/guildConfigService');
const { isConfigManager, isAdmin } = require('../../utils/permissions');

function roleSubcommand(name, description) {
    return sub => sub.setName(name)
        .setDescription(description)
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
        );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar-cargos')
        .setDescription('Gerencia os cargos usados pelo bot (supervisores, acesso, IA, cidadãos, gestores)')
        .addSubcommand(roleSubcommand('cargo-supervisor', 'Adiciona ou remove um cargo supervisor'))
        .addSubcommand(roleSubcommand('cargo-policia', 'Adiciona ou remove um cargo com acesso ao bot (sem cargos configurados, todos podem usar)'))
        .addSubcommand(roleSubcommand('cargo-ia', 'Adiciona ou remove um cargo de Assuntos Internos'))
        .addSubcommand(roleSubcommand('cargo-cidadao', 'Adiciona ou remove um cargo de cidadão (acesso apenas à Ouvidoria/denúncias civis)'))
        .addSubcommand(roleSubcommand('cargo-gestor', 'Adiciona ou remove um cargo gestor de configurações do bot (somente Administradores)')),

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

        const role   = interaction.options.getRole('cargo');
        const action = interaction.options.getString('acao');
        const verb   = action === 'add' ? 'adicionado' : 'removido';

        if (sub === 'cargo-supervisor') {
            const updated = await guildConfigService.setRole(guildId, role, action === 'add');
            const list = updated.length > 0 ? updated.map(id => `<@&${id}>`).join(', ') : 'Nenhum';
            return interaction.editReply({ content: `✅ Cargo ${role} **${verb}**.\nSupervisores atuais: ${list}` });
        }

        if (sub === 'cargo-policia') {
            const updated = await guildConfigService.setPoliceRole(guildId, role, action === 'add');
            const list = updated.length > 0 ? updated.map(id => `<@&${id}>`).join(', ') : 'Nenhum (todos podem usar o bot)';
            return interaction.editReply({ content: `✅ Cargo ${role} **${verb}** como cargo policial.\nCargos com acesso ao bot: ${list}` });
        }

        if (sub === 'cargo-cidadao') {
            const updated = await guildConfigService.setCitizenRole(guildId, role, action === 'add');
            const list = updated.length > 0 ? updated.map(id => `<@&${id}>`).join(', ') : 'Nenhum';
            return interaction.editReply({ content: `✅ Cargo ${role} **${verb}** como cargo de cidadão.\nCargos de cidadão atuais: ${list}` });
        }

        if (sub === 'cargo-ia') {
            const updated = await guildConfigService.setIARole(guildId, role, action === 'add');
            const list = updated.length > 0 ? updated.map(id => `<@&${id}>`).join(', ') : 'Nenhum';
            return interaction.editReply({ content: `✅ Cargo ${role} **${verb}** como Assuntos Internos.\nCargos de IA atuais: ${list}` });
        }

        if (sub === 'cargo-gestor') {
            const updated = await guildConfigService.setConfigManagerRole(guildId, role, action === 'add');
            const list = updated.length > 0 ? updated.map(id => `<@&${id}>`).join(', ') : 'Nenhum';
            return interaction.editReply({ content: `✅ Cargo ${role} **${verb}** como gestor de configurações.\nGestores atuais: ${list}` });
        }
    },
};
