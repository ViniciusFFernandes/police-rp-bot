const { PermissionFlagsBits } = require('discord.js');
const guildConfigRepo = require('../repositories/guildConfigRepository');

async function isSupervisor(member) {
    const roles = await guildConfigRepo.getSupervisorRoles(member.guild.id);
    return roles.some(roleId => member.roles.cache.has(roleId));
}

function isAdmin(member) {
    return member.permissions.has(PermissionFlagsBits.Administrator);
}

async function canManageShift(interaction, shiftOwnerId) {
    const member = interaction.member;
    if (member.id === shiftOwnerId) return true;
    if (isAdmin(member)) return true;
    if (await isSupervisor(member)) return true;
    return false;
}

module.exports = { isSupervisor, isAdmin, canManageShift };
