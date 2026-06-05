-- Suporte a múltiplos acusados por investigação
ALTER TABLE ia_investigations
ADD COLUMN IF NOT EXISTS additional_involved_ids TEXT DEFAULT NULL;
-- Armazena JSON array de Discord IDs adicionais: ["id1","id2",...]
