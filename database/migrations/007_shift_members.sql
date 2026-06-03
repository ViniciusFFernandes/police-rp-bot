-- =============================================
-- UNIDADE OPERACIONAL — membros do turno e motivo de encerramento
-- =============================================
-- O turno deixa de ser individual e passa a representar uma Unidade
-- Operacional com um líder (motorista/responsável) e oficiais adicionais.
-- A tabela shifts.user_id continua apontando para o LÍDER da unidade,
-- preservando toda a lógica existente. Os participantes (líder + membros)
-- passam a ser registrados em shift_members.

-- =============================================
-- TABELA: shift_members
-- =============================================
CREATE TABLE IF NOT EXISTS shift_members (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shift_id    UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(10) NOT NULL DEFAULT 'MEMBER'
                CHECK (role IN ('LEADER', 'MEMBER')),
    joined_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (shift_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shift_members_shift ON shift_members (shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_members_user  ON shift_members (user_id);

-- =============================================
-- MOTIVO DE ENCERRAMENTO
-- =============================================
-- end_reason:      'patrol_end' (Fim de Patrulha) | 'remodulation' (Remodulação) | 'other' (Outro)
-- end_reason_note: texto livre opcional, usado quando end_reason = 'other'
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_reason      VARCHAR(20);
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_reason_note TEXT;

-- =============================================
-- BACKFILL — turnos existentes viram unidades de 1 membro (o líder)
-- =============================================
INSERT INTO shift_members (shift_id, user_id, role)
SELECT id, user_id, 'LEADER'
FROM shifts
ON CONFLICT (shift_id, user_id) DO NOTHING;
