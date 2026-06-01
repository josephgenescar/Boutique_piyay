-- Admin notifications table and triggers for Boutique Piyay
-- Run this in Supabase SQL editor

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

-- Function to call admin-notification edge function
CREATE OR REPLACE FUNCTION notify_admin(notification_type text, notification_data jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Call the admin-notification edge function via HTTP
  -- This will be handled by the application layer
  -- The function is called from the frontend/backend when events occur
END;
$$;

-- Trigger for new orders
CREATE OR REPLACE FUNCTION handle_new_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO admin_notifications (type, title, message, data, is_read)
  VALUES (
    'new_order',
    'Nouvo Komann - ' || COALESCE(NEW.customer_name, 'Kliyan'),
    'Yon nouvo komann te fè sou Boutique Piyay',
    jsonb_build_object(
      'order_id', NEW.id,
      'order_group_id', NEW.order_group_id,
      'customer_name', NEW.customer_name,
      'customer_email', NEW.customer_email,
      'customer_phone', NEW.customer_phone,
      'amount', NEW.amount,
      'payment_method', NEW.payment_method,
      'shipping_address', NEW.shipping_address,
      'order_items', NEW.order_items,
      'created_at', NEW.created_at
    ),
    false
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_new_order
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION handle_new_order();

-- Trigger for new sellers (when is_active_seller becomes true)
CREATE OR REPLACE FUNCTION handle_new_seller()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_active_seller = true AND (OLD.is_active_seller = false OR OLD.is_active_seller IS NULL) THEN
    INSERT INTO admin_notifications (type, title, message, data, is_read)
    VALUES (
      'new_seller',
      'Nouvo Vandè - ' || COALESCE(NEW.shop_name, NEW.full_name, 'Vandè'),
      'Yon nouvo vandè te enskri sou Boutique Piyay',
      jsonb_build_object(
        'seller_id', NEW.id,
        'full_name', NEW.full_name,
        'shop_name', NEW.shop_name,
        'email', NEW.email,
        'whatsapp', NEW.whatsapp,
        'whatsapp_number', NEW.whatsapp_number,
        'created_at', NEW.created_at
      ),
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_new_seller
AFTER UPDATE OF is_active_seller ON profiles
FOR EACH ROW
WHEN (NEW.is_active_seller = true)
EXECUTE FUNCTION handle_new_seller();

-- Trigger for new products
CREATE OR REPLACE FUNCTION handle_new_product()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO admin_notifications (type, title, message, data, is_read)
  VALUES (
    'new_product',
    'Nouvo Pwodwi - ' || COALESCE(NEW.title, 'Pwodwi'),
    'Yon nouvo pwodwi te ajoute sou Boutique Piyay',
    jsonb_build_object(
      'product_id', NEW.id,
      'seller_id', NEW.seller_id,
      'title', NEW.title,
      'description', NEW.description,
      'category', NEW.category,
      'price', NEW.price,
      'old_price', NEW.old_price,
      'stock', NEW.stock,
      'image_url', NEW.image_url,
      'is_approved', NEW.is_approved,
      'created_at', NEW.created_at
    ),
    false
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_new_product
AFTER INSERT ON user_products
FOR EACH ROW
EXECUTE FUNCTION handle_new_product();

-- Trigger for product approval requests (when is_approved is false)
CREATE OR REPLACE FUNCTION handle_product_approval_request()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_approved = false THEN
    INSERT INTO admin_notifications (type, title, message, data, is_read)
    VALUES (
      'product_approval_request',
      'Demann Aprobasyon Pwodwi - ' || COALESCE(NEW.title, 'Pwodwi'),
      'Yon pwodwi bezwen aprobasyon',
      jsonb_build_object(
        'product_id', NEW.id,
        'seller_id', NEW.seller_id,
        'title', NEW.title,
        'category', NEW.category,
        'price', NEW.price,
        'created_at', NEW.created_at
      ),
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_product_approval_request
AFTER INSERT ON user_products
FOR EACH ROW
WHEN (NEW.is_approved = false)
EXECUTE FUNCTION handle_product_approval_request();

-- Trigger for withdrawal requests
CREATE OR REPLACE FUNCTION handle_withdrawal_request()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    -- Get seller info
    DECLARE
      seller_info RECORD;
    BEGIN
      SELECT p.full_name, p.shop_name, p.email
      INTO seller_info
      FROM profiles p
      JOIN affiliates a ON p.id = a.user_id
      WHERE a.id = NEW.affiliate_id;
      
      INSERT INTO admin_notifications (type, title, message, data, is_read)
      VALUES (
        'withdrawal_request',
        'Demann Retra - ' || COALESCE(seller_info.shop_name, seller_info.full_name, 'Vandè'),
        'Yon vandè te mande retrè lajan',
        jsonb_build_object(
          'withdrawal_id', NEW.id,
          'affiliate_id', NEW.affiliate_id,
          'seller_name', COALESCE(seller_info.shop_name, seller_info.full_name),
          'amount', NEW.amount,
          'method', NEW.method,
          'number', NEW.number,
          'status', NEW.status,
          'created_at', NEW.created_at
        ),
        false
      );
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_withdrawal_request
AFTER INSERT ON affiliate_withdrawals
FOR EACH ROW
EXECUTE FUNCTION handle_withdrawal_request();

-- Add subscription_ends_at column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;

-- Trigger for subscription payments (when subscription_ends_at is updated)
CREATE OR REPLACE FUNCTION handle_subscription_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.subscription_ends_at IS NOT NULL AND (OLD.subscription_ends_at IS NULL OR NEW.subscription_ends_at > OLD.subscription_ends_at) THEN
    INSERT INTO admin_notifications (type, title, message, data, is_read)
    VALUES (
      'subscription_payment',
      'Peman Abònman - ' || COALESCE(NEW.shop_name, NEW.full_name, 'Vandè'),
      'Yon vandè te peye abònman an',
      jsonb_build_object(
        'seller_id', NEW.id,
        'seller_name', COALESCE(NEW.shop_name, NEW.full_name),
        'email', NEW.email,
        'subscription_ends_at', NEW.subscription_ends_at,
        'updated_at', NEW.updated_at
      ),
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_subscription_payment
AFTER UPDATE OF subscription_ends_at ON profiles
FOR EACH ROW
WHEN (NEW.subscription_ends_at IS NOT NULL)
EXECUTE FUNCTION handle_subscription_payment();
