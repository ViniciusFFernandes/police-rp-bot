const { PermissionFlagsBits } = require('discord.js');
const guildConfigRepo = require('../repositories/guildConfigRepository');

function isAdmin(member) {
    return member.permissions.has(PermissionFlagsBits.Administrator);
}

async function hasHpAccess(member) {
    if (isAdmin(member)) return true;
    const roles = await guildConfigRepo.getHpRoles(member.guild.id);
    if (roles.length === 0) return false;
    return roles.some(id => member.roles.cache.has(id));
}

async function isHpSupervisor(member) {
    if (isAdmin(member)) return true;
    const roles = await guildConfigRepo.getHpSupervisorRoles(member.guild.id);
    return roles.some(id => member.roles.cache.has(id));
}

module.exports = { isAdmin, hasHpAccess, isHpSupervisor };
