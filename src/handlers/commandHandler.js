const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const logger = require('../utils/logger');

function loadCommands(client) {
    client.commands = new Collection();

    const commandsDir = path.join(__dirname, '..', 'commands');
    const folders = fs.readdirSync(commandsDir);

    for (const folder of folders) {
        const folderPath = path.join(commandsDir, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
            const command = require(path.join(folderPath, file));
            if (!command.data || !command.execute) {
                logger.warn(`Comando inválido: ${file}`);
                continue;
            }
            client.commands.set(command.data.name, command);
            logger.debug(`Comando carregado: /${command.data.name}`);
        }
    }

    logger.info(`${client.commands.size} comando(s) carregado(s)`);
}

async function handleCommand(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (err) {
        logger.error(`Erro no comando /${interaction.commandName}`, { error: err.message, stack: err.stack });
        const reply = { content: '❌ Ocorreu um erro ao executar este comando.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
}

module.exports = { loadCommands, handleCommand };
