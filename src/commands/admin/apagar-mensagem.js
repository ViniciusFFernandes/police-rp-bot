const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { isConfigManager, isAdmin } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apagar-mensagem')
        .setDescription('Apaga uma mensagem do bot pelo ID (somente admins e gestores)')
        .addStringOption(opt =>
            opt.setName('id')
                .setDescription('ID da mensagem a apagar')
                .setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName('canal')
                .setDescription('Canal onde está a mensagem (padrão: canal atual)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!isAdmin(interaction.member) && !await isConfigManager(interaction.member)) {
            return interaction.editReply({ content: '❌ Apenas **Administradores** e **Gestores de Configuração** podem usar este comando.' });
        }

        const msgId   = interaction.options.getString('id').trim();
        const channel = interaction.options.getChannel('canal') ?? interaction.channel;

        let msg;
        try {
            msg = await channel.messages.fetch(msgId);
        } catch {
            return interaction.editReply({ content: `❌ Mensagem \`${msgId}\` não encontrada em ${channel}.` });
        }

        if (msg.author.id !== interaction.client.user.id) {
            return interaction.editReply({ content: '❌ Essa mensagem não é do bot.' });
        }

        await msg.delete();
        return interaction.editReply({ content: `✅ Mensagem apagada de ${channel}.` });
    },
};
