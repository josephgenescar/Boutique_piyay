# SQL Setup pour Boutique Piyay

## 1. AJOUTE KOLÒN NAN TABLE `orders`
```sql
-- Ajoute order_group_id si pa egziste
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_group_id TEXT UNIQUE;

-- Index pou rapid lookup
CREATE INDEX IF NOT EXISTS idx_orders_order_group_id ON orders(order_group_id);
```

## 2. AJOUTE KOLÒN NAN TABLE `user_products` POU FLASH SALE
```sql
-- Kolòn flash sale
ALTER TABLE user_products 
ADD COLUMN IF NOT EXISTS is_flash_sale BOOLEAN DEFAULT false;

-- Kolòn timestamp lè flash sale komanse
ALTER TABLE user_products 
ADD COLUMN IF NOT EXISTS flash_start_at TIMESTAMP DEFAULT NULL;

-- Kolòn kont flash sale pa machann
ALTER TABLE user_products 
ADD COLUMN IF NOT EXISTS flash_sale_count INTEGER DEFAULT 0;

-- Index pou rapid filter
CREATE INDEX IF NOT EXISTS idx_user_products_is_flash_sale ON user_products(is_flash_sale, flash_start_at);
CREATE INDEX IF NOT EXISTS idx_user_products_seller_flash ON user_products(seller_id, is_flash_sale);
```

## 3. FONCTION POU OTOMATIKMAN EFASE FLASH SALE APRE 24H
```sql
-- Fonction PL/pgSQL pou cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_flash_sales()
RETURNS void AS $$
BEGIN
  UPDATE user_products
  SET is_flash_sale = false, flash_start_at = NULL
  WHERE is_flash_sale = true
    AND flash_start_at IS NOT NULL
    AND (NOW() - flash_start_at) > INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Trigger ki vire all 30 minit
SELECT cron.schedule('cleanup_expired_flash_sales', '*/30 * * * *', 'SELECT cleanup_expired_flash_sales()');
```

## 4. VALIDASYON: MAKSIMUM 3 FLASH SALE PAR MACHANN
```sql
-- Function pou valide anvan insert/update
CREATE OR REPLACE FUNCTION validate_flash_sale_limit()
RETURNS TRIGGER AS $$
DECLARE
  flash_count INTEGER;
BEGIN
  IF NEW.is_flash_sale = true THEN
    SELECT COUNT(*) INTO flash_count
    FROM user_products
    WHERE seller_id = NEW.seller_id
      AND is_flash_sale = true
      AND id != COALESCE(OLD.id, -1)
      AND flash_start_at IS NOT NULL
      AND (NOW() - flash_start_at) < INTERVAL '24 hours';
    
    IF flash_count >= 3 THEN
      RAISE EXCEPTION 'Maksimum 3 pwodwi flash sale aktif pou chak machann';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS check_flash_sale_limit ON user_products;
CREATE TRIGGER check_flash_sale_limit
BEFORE INSERT OR UPDATE ON user_products
FOR EACH ROW
EXECUTE FUNCTION validate_flash_sale_limit();
```

## 5. VERIFYE KOLÒN EGZISTANS
```sql
-- Kolòn yo dwe egziste nan user_products:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_products' 
ORDER BY ordinal_position;

-- Kolòn yo dwe egziste nan orders:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
```

## ✅ Etap:
1. Kopiey tout SQL anba
2. Ale nan Supabase → SQL Editor
3. Kolle epi exekite
4. Konfime pa gen erè
5. Teste par ajoute 3 pwodwi flash sale - pa ta dwe permèt 4yèm
