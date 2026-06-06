-- Identificação obrigatória do denunciante civil (remove fluxo anônimo)

ALTER TABLE civil_complaints ADD COLUMN IF NOT EXISTS citizen_id VARCHAR(50);
ALTER TABLE civil_complaints ADD COLUMN IF NOT EXISTS phone      VARCHAR(30);
