require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsDir = path.join(__dirname, '..', 'src', 'commands');

for (const folder of fs.readdirSync(commandsDir)) {
    const folderPath = path.join(commandsDir, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    for (const file of fs.readdirSync(folderPath).filter(f => f.endsWith('.js'))) {
        const command = require(path.join(folderPath, file));
        if (command.data) {
            commands.push(command.data.toJSON());
            console.log(`[+] /${command.data.name}`);
        }
    }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        const guildId = process.env.DEPLOY_GUILD_ID;

        if (guildId) {
            console.log(`\nRegistrando ${commands.length} comando(s) no servidor ${guildId} (instantâneo)...`);
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                { body: commands }
            );
            console.log(`\n✅ ${data.length} comando(s) registrado(s) no servidor.`);
        } else {
            console.log(`\nRegistrando ${commands.length} comando(s) globalmente...`);
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            console.log(`\n✅ ${data.length} comando(s) registrado(s).`);
            console.log('ℹ️  Comandos globais podem levar até 1h para aparecer em novos servidores.');
        }
    } catch (err) {
        console.error('Erro ao registrar comandos:', err);
        process.exit(1);
    }
})();
