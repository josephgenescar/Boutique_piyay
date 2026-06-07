-- Supabase schema for Boutique Piyay
-- Run this in Supabase SQL editor.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Profiles / seller accounts
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  shop_name text,
  role text DEFAULT 'client',
  is_active_seller boolean DEFAULT false,
  wallet_balance numeric(12,2) DEFAULT 0,
  points integer DEFAULT 0,
  whatsapp text,
  whatsapp_number text,
  address text,
  avatar_url text,
  facebook_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Migration for existing profiles table: add seller/shop fields if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shop_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active_seller boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code text;

-- Fill missing shop_name for active sellers already registered before shop_name was added
UPDATE profiles
SET shop_name = full_name
WHERE is_active_seller = true
  AND (shop_name IS NULL OR shop_name = '');

CREATE INDEX IF NOT EXISTS idx_profiles_is_active_seller ON profiles(is_active_seller);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 2) Affiliates / referral program
CREATE TABLE IF NOT EXISTS affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  referral_code text UNIQUE,
  balance numeric(12,2) DEFAULT 0,
  total_referrals integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);

CREATE TABLE IF NOT EXISTS referral_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  used_by uuid REFERENCES profiles(id),
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referral_keys_code ON referral_keys(code);

INSERT INTO referral_keys (code) VALUES ('PIYAYVIP2026') ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS affiliate_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES affiliates(id),
  amount numeric(12,2) NOT NULL,
  type text,
  description text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_transactions_affiliate_id ON affiliate_transactions(affiliate_id);

CREATE TABLE IF NOT EXISTS affiliate_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES affiliates(id),
  amount numeric(12,2) NOT NULL,
  method text,
  number text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_affiliate_id ON affiliate_withdrawals(affiliate_id);

-- 3) Products listed by sellers
CREATE TABLE IF NOT EXISTS user_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  description text,
  category text,
  price numeric(12,2) NOT NULL,
  old_price numeric(12,2),
  stock integer DEFAULT 1,
  image_url text,
  is_flash_sale boolean DEFAULT false,
  flash_start_at timestamptz,
  flash_sale_count integer DEFAULT 0,
  is_boosted boolean DEFAULT false,
  boost_expires_at timestamptz,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_products_seller_id ON user_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_user_products_is_flash_sale ON user_products(is_flash_sale, flash_start_at);
CREATE INDEX IF NOT EXISTS idx_user_products_is_boosted ON user_products(is_boosted, boost_expires_at);

-- 4) Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_group_id text UNIQUE,
  seller_id uuid REFERENCES profiles(id),
  product_id uuid REFERENCES user_products(id),
  buyer_id uuid REFERENCES profiles(id),
  product_title text,
  customer_name text,
  customer_email text,
  customer_phone text,
  amount numeric(12,2) NOT NULL,
  quantity integer DEFAULT 1,
  status text DEFAULT 'pending',
  payment_method text,
  payment_status text DEFAULT 'pending',
  currency text DEFAULT 'HTG',
  shipping_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Migration for existing orders table: add missing columns if the table already exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES user_products(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_id uuid REFERENCES profiles(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_title text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount numeric(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency text DEFAULT 'HTG';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_phone text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zone text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_items jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_price numeric(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_orders_order_group_id ON orders(order_group_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 5) Site traffic tracking for admin analytics
CREATE TABLE IF NOT EXISTS site_traffic (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz DEFAULT now(),
  page text,
  visit_count integer DEFAULT 0,
  seller_id uuid REFERENCES profiles(id)
);
CREATE INDEX IF NOT EXISTS idx_site_traffic_seller_id ON site_traffic(seller_id);

-- Optional wallet support used by netlify/functions/wallet.js
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  balance numeric(12,2) DEFAULT 0,
  total_withdrawn numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES wallets(id),
  order_id uuid REFERENCES orders(id),
  type text,
  amount numeric(12,2) NOT NULL,
  status text,
  description text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
