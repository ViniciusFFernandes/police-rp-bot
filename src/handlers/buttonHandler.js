const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const buttons = new Map();

function loadButtons() {
    const dir = path.join(__dirname, '..', 'buttons');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

    for (const file of files) {
        const handler = require(path.join(dir, file));
        buttons.set(handler.customId, handler);
        logger.debug(`Button handler carregado: ${handler.customId}`);
    }

    logger.info(`${buttons.size} button handler(s) carregado(s)`);
}

async function handleButton(interaction) {
    const [prefix] = interaction.customId.split(':');
    const handler = buttons.get(prefix);

    if (!handler) {
        logger.warn(`Nenhum handler para botão: ${interaction.customId}`);
        return;
    }

    try {
        await handler.execute(interaction);
    } catch (err) {
        logger.error(`Erro no button handler: ${interaction.customId}`, { error: err.message });
        const reply = { content: '❌ Erro ao processar ação.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
}

module.exports = { loadButtons, handleButton };
