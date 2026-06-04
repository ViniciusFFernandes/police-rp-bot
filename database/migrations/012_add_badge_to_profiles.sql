-- Adiciona número do distintivo (badge) ao perfil operacional do oficial
ALTER TABLE official_profiles ADD COLUMN IF NOT EXISTS badge_num VARCHAR(20);
