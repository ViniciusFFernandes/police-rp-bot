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

// Verifica se o membro pode usar o bot. Se nenhum cargo policial estiver
// configurado, todos os membros têm acesso (compatibilidade retroativa).
// Administradores do servidor sempre passam.
async function hasPoliceAccess(member) {
    if (isAdmin(member)) return true;
    const roles = await guildConfigRepo.getPoliceRoles(member.guild.id);
    if (roles.length === 0) return true; // sem restrição configurada
    return roles.some(roleId => member.roles.cache.has(roleId));
}

// Pode usar comandos e interagir com quadros de Assuntos Internos
async function isIAStaff(member) {
    if (isAdmin(member)) return true;
    if (await isSupervisor(member)) return true;
    const roles = await guildConfigRepo.getIARoles(member.guild.id);
    return roles.some(roleId => member.roles.cache.has(roleId));
}

// Verifica se o membro pode usar o painel da Ouvidoria Civil (denúncias).
// Cidadãos com o cargo configurado podem; oficiais (acesso ao bot) e admins também.
// Se nenhum cargo de cidadão estiver configurado, qualquer membro pode usar.
async function isCitizen(member) {
    if (isAdmin(member)) return true;
    if (await hasPoliceAccess(member)) return true;
    const roles = await guildConfigRepo.getCitizenRoles(member.guild.id);
    if (roles.length === 0) return true;
    return roles.some(roleId => member.roles.cache.has(roleId));
}

async function canManageShift(interaction, shiftOwnerId) {
    const member = interaction.member;
    if (member.id === shiftOwnerId) return true;
    return isIAStaff(member);
}

module.exports = { isSupervisor, isAdmin, isConfigManager, isIAStaff, hasPoliceAccess, isCitizen, canManageShift };
