const userRepo            = require('../repositories/userRepository');
const officialProfileRepo = require('../repositories/officialProfileRepository');
const callsignBoardService = require('../services/callsignBoardService');
const logger = require('../utils/logger');

module.exports = {
    customId: 'modal:adminpanel_profile_define',

    matches(id) {
        return id.startsWith('modal:adminpanel_profile_define:');
    },

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetDiscordId = interaction.customId.split(':')[2];
        const guildId         = interaction.guildId;

        const district    = interaction.fields.getTextInputValue('distrito').trim().toUpperCase();
        const callsignNum = interaction.fields.getTextInputValue('callsign').trim();
        const badgeNum    = interaction.fields.getTextInputValue('distintivo')?.trim() || null;
        const nome        = interaction.fields.getTextInputValue('nome')?.trim() || null;

        try {
            const subject = await interaction.guild.members.fetch(targetDiscordId).catch(() => null);
            const subjectUser = subject?.user ?? await interaction.client.users.fetch(targetDiscordId).catch(() => null);

            if (!subjectUser) {
                return interaction.editReply({ content: '❌ Não foi possível encontrar o usuário informado.' });
            }

            let displayName = subject?.displayName ?? subjectUser.username;

            if (nome) {
                const existingProfile = await officialProfileRepo.findByDiscordId(targetDiscordId, guildId);
                const effectiveBadge  = badgeNum ?? existingProfile?.badge_num ?? null;
                const nickname        = effectiveBadge
                    ? `${effectiveBadge}-${callsignNum} | ${nome}`
                    : `${callsignNum} | ${nome}`;

                if (subject) {
                    await subject.setNickname(nickname).catch(() => {});
                }
                displayName = nome;
            }

            const dbUser = await userRepo.upsert(
                subjectUser.id,
                subjectUser.username,
                displayName,
            );

            await officialProfileRepo.upsert(dbUser.id, guildId, district, callsignNum, badgeNum);

            callsignBoardService.refresh(interaction.guild).catch(() => {});

            return interaction.editReply({
                content:
                    `✅ Perfil de <@${targetDiscordId}> atualizado.\n` +
                    `📍 Distrito: **${district}** · 📟 Callsign: **${callsignNum}**` +
                    (badgeNum ? ` · 🪪 Distintivo: **${badgeNum}**` : '') +
                    (nome ? ` · 👤 Nome: **${nome}**` : ''),
            });
        } catch (err) {
            logger.error('Erro ao definir perfil pelo painel admin', { guild: guildId, error: err.message });
            return interaction.editReply({ content: '❌ Ocorreu um erro ao salvar o perfil. Tente novamente.' });
        }
    },
};
