const shiftService = require('../services/shiftService');
const officialWeaponRepo = require('../repositories/officialWeaponRepository');
const userRepo = require('../repositories/userRepository');
const { requireConfig } = require('../utils/configGuard');
const logger = require('../utils/logger');

module.exports = {
    customId: 'modal:start_shift',

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const cfg = await requireConfig(interaction);
        if (!cfg) return;

        const district = interaction.fields.getTextInputValue('district').trim().toUpperCase();
        const unit     = interaction.fields.getTextInputValue('unit').trim().toUpperCase();
        const callsign = interaction.fields.getTextInputValue('callsign').trim();

        const fullCallsign  = `${district}-${unit}-${callsign}`;
        const vehiclePrefix = `${district}${callsign}`;

        // Verifica se o oficial tem armas no arsenal
        const dbUser = await userRepo.findByDiscordId(interaction.user.id);
        const arsenal = dbUser ? await officialWeaponRepo.findByUser(dbUser.id, interaction.guildId) : [];

        try {
            const result = await shiftService.startShift(interaction, cfg, {
                callsign: fullCallsign,
                vehiclePrefix,
            });

            if (result.error) {
                return interaction.editReply({ content: `❌ ${result.error}` });
            }

            const arsenalInfo = arsenal.length > 0
                ? `\n🔫 **${arsenal.length} arma(s)** do seu arsenal foram carregadas automaticamente.`
                : '\n⚠️ Você não possui armas cadastradas no arsenal. Use o botão **Adicionar Arma** na embed do turno ou `/arma registrar`.';

            await interaction.editReply({
                content: `✅ Turno iniciado! Callsign: **${fullCallsign}** | Viatura: **${vehiclePrefix}**${arsenalInfo}`,
            });
        } catch (err) {
            logger.error('Erro ao iniciar turno via modal', { guild: interaction.guildId, error: err.message });
            await interaction.editReply({ content: '❌ Ocorreu um erro ao iniciar o turno. Tente novamente.' });
        }
    },
};
