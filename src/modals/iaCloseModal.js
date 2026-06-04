// Modal handler: ia_close:<id> — finalizes an investigation with verdict
const iaRepo    = require('../repositories/iaRepository');
const iaService = require('../services/iaService');

const VALID_VERDICTS = ['sustained', 'not_sustained', 'exonerated', 'unfounded'];

module.exports = {
    customId: 'ia_close',
    matches: (id) => id.startsWith('ia_close:'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const invId  = interaction.customId.split(':')[1];
        const verdict = interaction.fields.getTextInputValue('verdict').trim().toLowerCase();
        const penaltyRecommendation = interaction.fields.getTextInputValue('penalty_recommendation').trim() || null;

        if (!VALID_VERDICTS.includes(verdict)) {
            return interaction.editReply({
                content:
                    '❌ Veredicto inválido. Use exatamente um dos valores:\n' +
                    '`sustained` | `not_sustained` | `exonerated` | `unfounded`',
            });
        }

        const inv = await iaRepo.findById(invId, interaction.guildId);
        if (!inv) return interaction.editReply({ content: '❌ Investigação não encontrada.' });

        await iaRepo.close(invId, interaction.guildId, verdict, penaltyRecommendation);
        const updated = await iaRepo.findById(invId, interaction.guildId);
        await iaService.refreshBoard(interaction.guild, updated);

        const VERDICT_LABEL = {
            sustained:     'Sustentado',
            not_sustained: 'Não Sustentado',
            exonerated:    'Exonerado',
            unfounded:     'Infundado',
        };

        await interaction.editReply({
            content:
                `✅ Investigação **${inv.case_number}** encerrada.\n` +
                `⚖️ Veredicto: **${VERDICT_LABEL[verdict]}**\n` +
                (penaltyRecommendation ? `📋 Penalidade: ${penaltyRecommendation}` : ''),
        });
    },
};
