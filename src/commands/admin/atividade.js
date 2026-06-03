const { SlashCommandBuilder, ActivityType } = require('discord.js');
const botConfigRepo = require('../../repositories/botConfigRepository');

const TYPE_MAP = {
    WATCHING:  ActivityType.Watching,
    PLAYING:   ActivityType.Playing,
    LISTENING: ActivityType.Listening,
    COMPETING: ActivityType.Competing,
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('atividade')
        .setDescription('Altera a atividade exibida no status do bot (apenas dono do bot)')
        .addStringOption(opt =>
            opt.setName('tipo')
                .setDescription('Tipo da atividade')
                .setRequired(true)
                .addChoices(
                    { name: 'Assistindo',  value: 'WATCHING'  },
                    { name: 'Jogando',     value: 'PLAYING'   },
                    { name: 'Ouvindo',     value: 'LISTENING' },
                    { name: 'Competindo',  value: 'COMPETING' },
                )
        )
        .addStringOption(opt =>
            opt.setName('texto')
                .setDescription('Texto da atividade (ex: Departamento de Polícia)')
                .setRequired(true)
                .setMaxLength(128)
        ),

    async execute(interaction) {
        const ownerId = process.env.BOT_OWNER_ID;
        if (!ownerId || interaction.user.id !== ownerId) {
            return interaction.reply({
                content: '⛔ Apenas o dono do bot pode alterar a atividade.',
                ephemeral: true,
            });
        }

        const tipo  = interaction.options.getString('tipo');
        const texto = interaction.options.getString('texto');

        await botConfigRepo.set('activity_type', tipo);
        await botConfigRepo.set('activity_text', texto);

        interaction.client.user.setActivity(texto, { type: TYPE_MAP[tipo] });

        const labels = { WATCHING: 'Assistindo', PLAYING: 'Jogando', LISTENING: 'Ouvindo', COMPETING: 'Competindo' };
        return interaction.reply({
            content: `✅ Atividade atualizada: **${labels[tipo]} ${texto}**`,
            ephemeral: true,
        });
    },
};
