import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_EMAIL = 'josephgenescar@gmail.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, data } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let subject = ''
    let html = ''

    switch (type) {
      case 'new_order':
        subject = `🛒 Nouvo Komann - ${data.customer_name || 'Kliyan'}`
        html = generateNewOrderEmail(data)
        break

      case 'new_seller':
        subject = `🏪 Nouvo Vandè - ${data.full_name || data.shop_name || 'Vandè'}`
        html = generateNewSellerEmail(data)
        break

      case 'new_product':
        subject = `📦 Nouvo Pwodwi - ${data.title || 'Pwodwi'}`
        html = generateNewProductEmail(data)
        break

      case 'product_approval_request':
        subject = `✋ Demann Aprobasyon Pwodwi - ${data.title || 'Pwodwi'}`
        html = generateProductApprovalEmail(data)
        break

      case 'withdrawal_request':
        subject = `💰 Demann Retra - ${data.seller_name || 'Vandè'}`
        html = generateWithdrawalEmail(data)
        break

      case 'subscription_payment':
        subject = `💳 Peman Abònman - ${data.seller_name || 'Vandè'}`
        html = generateSubscriptionEmail(data)
        break

      default:
        subject = `🔔 Nouvo Notifikasyon - Boutique Piyay`
        html = generateGenericEmail(type, data)
    }

    // Send email via send-email function
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'admin_notification',
        to: ADMIN_EMAIL,
        subject: subject,
        html: html,
        data: { type, ...data },
      }),
    })

    if (!emailResponse.ok) {
      const error = await emailResponse.text()
      console.error('Email send error:', error)
    }

    // Store notification in database
    await supabase.from('admin_notifications').insert({
      type: type,
      title: subject,
      message: html,
      data: data,
      is_read: false,
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Admin notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateNewOrderEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff4747 0%, #ff6b6b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #ff4747; }
        .btn { background: #ff4747; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛒 Nouvo Komann</h1>
        </div>
        <div class="content">
          <p>Yon nouvo komann te fè sou Boutique Piyay!</p>
          
          <div class="info-box">
            <strong>Kliyan:</strong> ${data.customer_name || 'N/A'}<br>
            <strong>Telefòn:</strong> ${data.phone || 'N/A'}<br>
            <strong>Montan:</strong> ${data.amount || '0'} HTG<br>
            <strong>Metò Peman:</strong> ${data.payment_method || 'N/A'}<br>
            <strong>Adrès Livrezon:</strong> ${data.shipping_address || 'N/A'}
          </div>

          ${data.items ? `
          <h3>Atik yo:</h3>
          <ul>
            ${data.items.map((item: any) => `<li>${item.title} - ${item.quantity} x ${item.price} HTG</li>`).join('')}
          </ul>
          ` : ''}

          <p style="margin-top: 20px;">
            <a href="https://boutique-piyay.netlify.app/admin-stats.html" class="btn">Wè Komann nan</a>
          </p>
        </div>
        <div class="footer">
          <p>Boutique Piyay - © 2026</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateNewSellerEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #4CAF50; }
        .btn { background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏪 Nouvo Vandè</h1>
        </div>
        <div class="content">
          <p>Yon nouvo vandè te enskri sou Boutique Piyay!</p>
          
          <div class="info-box">
            <strong>Non:</strong> ${data.full_name || 'N/A'}<br>
            <strong>Non Boutik:</strong> ${data.shop_name || 'N/A'}<br>
            <strong>Email:</strong> ${data.email || 'N/A'}<br>
            <strong>Telefòn:</strong> ${data.whatsapp || 'N/A'}
          </div>

          <p style="margin-top: 20px;">
            <a href="https://boutique-piyay.netlify.app/admin-stats.html" class="btn">Aktive Vandè sa</a>
          </p>
        </div>
        <div class="footer">
          <p>Boutique Piyay - © 2026</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateNewProductEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2196F3 0%, #42A5F5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #2196F3; }
        .btn { background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📦 Nouvo Pwodwi</h1>
        </div>
        <div class="content">
          <p>Yon nouvo pwodwi te ajoute sou Boutique Piyay!</p>
          
          <div class="info-box">
            <strong>Tit:</strong> ${data.title || 'N/A'}<br>
            <strong>Kategori:</strong> ${data.category || 'N/A'}<br>
            <strong>Pri:</strong> ${data.price || '0'} HTG<br>
            <strong>Vandè:</strong> ${data.seller_name || 'N/A'}
          </div>

          <p style="margin-top: 20px;">
            <a href="https://boutique-piyay.netlify.app/admin-stats.html" class="btn">Aprove Pwodwi sa</a>
          </p>
        </div>
        <div class="footer">
          <p>Boutique Piyay - © 2026</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateProductApprovalEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF9800 0%, #FFB74D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #FF9800; }
        .btn { background: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✋ Demann Aprobasyon</h1>
        </div>
        <div class="content">
          <p>Yon pwodwi bezwen aprobasyon!</p>
          
          <div class="info-box">
            <strong>Tit:</strong> ${data.title || 'N/A'}<br>
            <strong>Kategori:</strong> ${data.category || 'N/A'}<br>
            <strong>Pri:</strong> ${data.price || '0'} HTG<br>
            <strong>Vandè:</strong> ${data.seller_name || 'N/A'}
          </div>

          <p style="margin-top: 20px;">
            <a href="https://boutique-piyay.netlify.app/admin-stats.html" class="btn">Aprove opi Rejte Pwodwi sa</a>
          </p>
        </div>
        <div class="footer">
          <p>Boutique Piyay - © 2026</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateWithdrawalEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #9C27B0; }
        .btn { background: #9C27B0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Demann Retra</h1>
        </div>
        <div class="content">
          <p>Yon vandè te mande retrè lajan!</p>
          
          <div class="info-box">
            <strong>Vandè:</strong> ${data.seller_name || 'N/A'}<br>
            <strong>Montan:</strong> ${data.amount || '0'} HTG<br>
            <strong>Metò:</strong> ${data.method || 'N/A'}<br>
            <strong>Nimewo:</strong> ${data.number || 'N/A'}
          </div>

          <p style="margin-top: 20px;">
            <a href="https://boutique-piyay.netlify.app/admin-stats.html" class="btn">Aprove opi Rejte Demann sa</a>
          </p>
        </div>
        <div class="footer">
          <p>Boutique Piyay - © 2026</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateSubscriptionEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #00BCD4 0%, #26C6DA 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #00BCD4; }
        .btn { background: #00BCD4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💳 Peman Abònman</h1>
        </div>
        <div class="content">
          <p>Yon vandè te peye abònman an!</p>
          
          <div class="info-box">
            <strong>Vandè:</strong> ${data.seller_name || 'N/A'}<br>
            <strong>Montan:</strong> ${data.amount || '0'} HTG<br>
            <strong>Dati Fin:</strong> ${data.subscription_ends_at || 'N/A'}
          </div>

          <p style="margin-top: 20px;">
            <a href="https://boutique-piyay.netlify.app/admin-stats.html" class="btn">Wè Detay</a>
          </p>
        </div>
        <div class="footer">
          <p>Boutique Piyay - © 2026</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateGenericEmail(type: string, data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #607D8B 0%, #78909C 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Nouvo Notifikasyon</h1>
        </div>
        <div class="content">
          <p>Tip: ${type}</p>
          <pre>${JSON.stringify(data, null, 2)}</pre>
          <p style="margin-top: 20px;">
            <a href="https://boutique-piyay.netlify.app/admin-stats.html" style="background: #607D8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ale nan Dashboard</a>
          </p>
        </div>
        <div class="footer">
          <p>Boutique Piyay - © 2026</p>
        </div>
      </div>
    </body>
    </html>
  `
}
