const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const modals = new Map();

function loadModals() {
    const dir = path.join(__dirname, '..', 'modals');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

    for (const file of files) {
        const handler = require(path.join(dir, file));
        modals.set(handler.customId, handler);
        logger.debug(`Modal handler carregado: ${handler.customId}`);
    }

    logger.info(`${modals.size} modal handler(s) carregado(s)`);
}

async function handleModal(interaction) {
    const handler = modals.get(interaction.customId);

    if (!handler) {
        logger.warn(`Nenhum handler para modal: ${interaction.customId}`);
        return;
    }

    try {
        await handler.execute(interaction);
    } catch (err) {
        logger.error(`Erro no modal handler: ${interaction.customId}`, { error: err.message });
        const reply = { content: '❌ Erro ao processar formulário.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
}

module.exports = { loadModals, handleModal };
