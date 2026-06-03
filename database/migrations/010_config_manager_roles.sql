-- Cargos autorizados a gerenciar as configurações do bot.
-- Armazenados na mesma tabela guild_config como JSON array,
-- seguindo o mesmo padrão de supervisor_role_ids.
-- Apenas Administradores do servidor podem adicionar/remover esses cargos.

INSERT INTO guild_config (guild_id, key, value)
SELECT guild_id, 'config_manager_role_ids', '[]'
FROM (SELECT DISTINCT guild_id FROM guild_config) g
ON CONFLICT (guild_id, key) DO NOTHING;
