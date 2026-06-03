require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');
const { loadCommands } = require('./handlers/commandHandler');
const { loadButtons } = require('./handlers/buttonHandler');
const { loadModals } = require('./handlers/modalHandler');
const { pool } = require('./database/pool');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
    ],
    partials: [Partials.Channel],
});

// ── Carrega handlers ──────────────────────────────────────────
loadCommands(client);
loadButtons();
loadModals();

// ── Carrega eventos ───────────────────────────────────────────
const eventsDir = path.join(__dirname, 'events');
fs.readdirSync(eventsDir)
    .filter(f => f.endsWith('.js'))
    .forEach(file => {
        const event = require(path.join(eventsDir, file));
        const method = event.once ? 'once' : 'on';
        client[method](event.name, (...args) => event.execute(...args));
        logger.debug(`Evento carregado: ${event.name}`);
    });

// ── Graceful shutdown ─────────────────────────────────────────
async function shutdown(signal) {
    logger.info(`Recebido ${signal}. Encerrando...`);
    client.destroy();
    await pool.end();
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
    logger.error('Rejeição não tratada', { error: err?.message, stack: err?.stack });
});

process.on('uncaughtException', (err) => {
    logger.error('Exceção não capturada', { error: err.message, stack: err.stack });
    process.exit(1);
});

// ── Login ─────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);
