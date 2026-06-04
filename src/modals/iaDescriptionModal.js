// Modal handler: ia_description — final step, creates the investigation
const pendingIA      = require('../utils/pendingIA');
const iaRepo         = require('../repositories/iaRepository');
const iaService      = require('../services/iaService');
const officialRepo   = require('../repositories/officialProfileRepository');
const userRepo       = require('../repositories/userRepository');

module.exports = {
    customId: 'ia_description',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const pending = pendingIA.get(interaction.guildId, interaction.user.id);
        if (!pending?.origin || !pending?.involvedDiscordId) {
            return interaction.editReply({ content: '❌ Sessão expirada. Inicie novamente com `/ia abrir`.' });
        }

        const description = interaction.fields.getTextInputValue('description').trim();
        const evidence    = interaction.fields.getTextInputValue('evidence').trim() || null;

        pendingIA.setStep2(interaction.guildId, interaction.user.id, { description, evidence });
        const data = pendingIA.get(interaction.guildId, interaction.user.id);

        // Busca perfil do oficial acusado para preencher callsign/badge/distrito
        const profile = await officialRepo.findByDiscordId(data.involvedDiscordId, interaction.guildId);

        const caseNumber = await iaRepo.nextCaseNumber(interaction.guildId);

        const inv = await iaRepo.create({
            guildId:           interaction.guildId,
            caseNumber,
            origin:            data.origin,
            openedByDiscordId: interaction.user.id,
            involvedDiscordId: data.involvedDiscordId,
            involvedCallsign:  profile?.callsign_num || null,
            involvedBadge:     profile?.badge_num    || null,
            involvedDistrict:  profile?.district     || null,
            radioVehicle:      data.radioVehicle,
            incidentDate:      data.incidentDate,
            incidentTime:      data.incidentTime,
            incidentLocation:  data.incidentLocation,
            classification:    data.classification,
            complainantId:     data.complainantId,
            description,
            evidence,
        });

        pendingIA.clear(interaction.guildId, interaction.user.id);

        // Publica o quadro no canal de IA configurado
        const board = await iaService.postBoard(interaction.guild, inv);

        const boardNote = board
            ? 'O quadro foi publicado no canal de Assuntos Internos.'
            : '⚠️ Investigação criada, mas o quadro não pôde ser publicado — verifique as permissões do bot no canal de IA ou use `/configurar canal-ia`.';

        await interaction.editReply({
            content: `✅ **Investigação ${caseNumber} aberta com sucesso!**\n${boardNote}`,
        });
    },
};
