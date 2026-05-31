-- Table boost_codes pour gérer les codes de boost avec limite d'utilisation
CREATE TABLE IF NOT EXISTS boost_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  seller_id uuid REFERENCES profiles(id) NOT NULL,
  max_uses integer DEFAULT 3,
  remaining_uses integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Ajouter colonne status si elle n'existe pas
ALTER TABLE boost_codes ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_boost_codes_code ON boost_codes(code);
CREATE INDEX IF NOT EXISTS idx_boost_codes_seller_id ON boost_codes(seller_id);
CREATE INDEX IF NOT EXISTS idx_boost_codes_status ON boost_codes(status);

-- Ajouter colonne boost_code_id dans user_products si elle n'existe pas
ALTER TABLE user_products 
ADD COLUMN IF NOT EXISTS boost_code_id uuid REFERENCES boost_codes(id);

-- Fonction pour décrémenter les utilisations restantes
CREATE OR REPLACE FUNCTION decrement_boost_uses()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si boost_code_id est défini et is_boosted est true
  IF NEW.boost_code_id IS NOT NULL AND NEW.is_boosted = true THEN
    UPDATE boost_codes 
    SET remaining_uses = remaining_uses - 1,
        updated_at = now(),
        status = CASE 
          WHEN remaining_uses - 1 <= 0 THEN 'used'
          ELSE status
        END
    WHERE id = NEW.boost_code_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour décrémenter automatiquement quand un produit est boosté
DROP TRIGGER IF EXISTS trigger_decrement_boost ON user_products;
CREATE TRIGGER trigger_decrement_boost
AFTER INSERT OR UPDATE OF is_boosted, boost_code_id ON user_products
FOR EACH ROW
EXECUTE FUNCTION decrement_boost_uses();
