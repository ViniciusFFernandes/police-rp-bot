require('dotenv').config();

const { REST, Routes } = require('discord.js');

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID  = process.argv[2];

if (!GUILD_ID) {
    console.error('Uso: node scripts/clear-guild-commands.js <GUILD_ID>');
    process.exit(1);
}

(async () => {
    try {
        console.log(`Limpando comandos de guild do servidor ${GUILD_ID}...`);
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: [] }
        );
        console.log('✅ Comandos de guild removidos. Só os globais permanecem.');
    } catch (err) {
        console.error('Erro:', err.message);
    }
})();
