// Modal handler: ia_close:<invId>:<verdict> — penalidade + encerra investigação
const iaRepo    = require('../repositories/iaRepository');
const iaService = require('../services/iaService');

const VERDICT_LABEL = {
    sustained:     'Sustentado',
    not_sustained: 'Não Sustentado',
    exonerated:    'Exonerado',
    unfounded:     'Infundado',
};

module.exports = {
    customId: 'ia_close',
    matches: (id) => id.startsWith('ia_close:'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const parts   = interaction.customId.split(':');
        const invId   = parts[1];
        const verdict = parts[2];

        const penaltyRecommendation = interaction.fields.getTextInputValue('penalty_recommendation').trim() || null;

        const inv = await iaRepo.findById(invId, interaction.guildId);
        if (!inv) return interaction.editReply({ content: '❌ Investigação não encontrada.' });

        await iaRepo.close(invId, interaction.guildId, verdict, penaltyRecommendation);
        const updated = await iaRepo.findById(invId, interaction.guildId);
        await iaService.refreshBoard(interaction.guild, updated);

        await interaction.editReply({
            content:
                `✅ Investigação **${inv.case_number}** encerrada.\n` +
                `⚖️ Veredicto: **${VERDICT_LABEL[verdict] || verdict}**\n` +
                (penaltyRecommendation ? `📋 Penalidade: ${penaltyRecommendation}` : ''),
        });
    },
};
