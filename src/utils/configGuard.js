const guildConfigRepo = require('../repositories/guildConfigRepository');

/**
 * Verifica se o servidor está configurado antes de executar uma operação.
 * Retorna a config completa ou responde com erro e retorna null.
 */
async function requireConfig(interaction) {
    const cfg = await guildConfigRepo.getAll(interaction.guildId);
    const missing = [];

    if (!cfg.shift_channel_id) missing.push('`/configurar canal-turnos`');
    if (!cfg.report_channel_id) missing.push('`/configurar canal-relatorios`');
    if (!cfg.weapon_report_channel_id) missing.push('`/configurar canal-armamento`');
    if (!cfg.voice_category_id) missing.push('`/configurar categoria-voz`');

    if (missing.length > 0) {
        const msg =
            '⚠️ **Este servidor ainda não está totalmente configurado.**\n\n' +
            'Peça a um administrador para executar:\n' +
            missing.join('\n');

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: msg });
        } else {
            await interaction.reply({ content: msg, ephemeral: true });
        }
        return null;
    }

    return cfg;
}

module.exports = { requireConfig };
