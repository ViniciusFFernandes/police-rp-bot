const { PermissionFlagsBits } = require('discord.js');
const guildConfigRepo = require('../repositories/guildConfigRepository');

async function isSupervisor(member) {
    const roles = await guildConfigRepo.getSupervisorRoles(member.guild.id);
    return roles.some(roleId => member.roles.cache.has(roleId));
}

function isAdmin(member) {
    return member.permissions.has(PermissionFlagsBits.Administrator);
}

// Pode gerenciar configurações do bot (canais, cargos, viaturas, unidades).
// Admin do servidor sempre pode; gestores de configuração também.
// A gestão dos próprios cargos gestores é exclusiva de Admins.
async function isConfigManager(member) {
    if (isAdmin(member)) return true;
    const roles = await guildConfigRepo.getConfigManagerRoles(member.guild.id);
    return roles.some(roleId => member.roles.cache.has(roleId));
}

async function canManageShift(interaction, shiftOwnerId) {
    const member = interaction.member;
    if (member.id === shiftOwnerId) return true;
    if (isAdmin(member)) return true;
    if (await isSupervisor(member)) return true;
    return false;
}

module.exports = { isSupervisor, isAdmin, isConfigManager, canManageShift };
