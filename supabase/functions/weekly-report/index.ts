import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get all active sellers
    const { data: sellers } = await supabase
      .from('profiles')
      .select('id, email, full_name, store_name')
      .eq('is_active_seller', true)

    if (!sellers || sellers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active sellers found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    for (const seller of sellers) {
      // Get seller's products
      const { data: products } = await supabase
        .from('user_products')
        .select('id, title, price, created_at, is_boosted')
        .eq('seller_id', seller.id)

      const totalProducts = products?.length || 0
      const newProducts = products?.filter(p => new Date(p.created_at) > new Date(oneWeekAgo)).length || 0
      const boostedProducts = products?.filter(p => p.is_boosted).length || 0

      // Get feedback for seller's products
      const { data: feedbacks } = await supabase
        .from('feedback')
        .select('rating, created_at')
        .in('product_id', products?.map(p => p.id) || [])
        .gte('created_at', oneWeekAgo)

      const newReviews = feedbacks?.length || 0
      const avgRating = feedbacks && feedbacks.length > 0
        ? (feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
        : '0.0'

      // Generate email HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .stat-box { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .stat-number { font-size: 32px; font-weight: bold; color: #ff6b35; }
            .stat-label { color: #666; font-size: 14px; }
            .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Rapò Semènèl - ${seller.store_name || seller.full_name}</h1>
              <p>Bonjou ${seller.full_name}!</p>
            </div>
            <div class="content">
              <p>Men estatistik boutik ou pou semèn ki pase:</p>
              
              <div class="stat-box">
                <div class="stat-number">${totalProducts}</div>
                <div class="stat-label">Total Pwodwi</div>
              </div>
              
              <div class="stat-box">
                <div class="stat-number">${newProducts}</div>
                <div class="stat-label">Nouvo Pwodwi (Semèn sa)</div>
              </div>
              
              <div class="stat-box">
                <div class="stat-number">${boostedProducts}</div>
                <div class="stat-label">Pwodwi Boost</div>
              </div>
              
              <div class="stat-box">
                <div class="stat-number">${newReviews}</div>
                <div class="stat-label">Nouvo Avis (Semèn sa)</div>
              </div>
              
              <div class="stat-box">
                <div class="stat-number">${avgRating} ⭐</div>
                <div class="stat-label">Mwayèn Rating</div>
              </div>
              
              <p style="margin-top: 20px;">
                <a href="https://boutique-piyay.netlify.app/dashboard.html" style="background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ale nan Dashboard</a>
              </p>
            </div>
            <div class="footer">
              <p>Rivayo Boutique - © 2026</p>
            </div>
          </div>
        </body>
        </html>
      `

      // Send email via send-email function
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'weekly_report',
          to: seller.email,
          subject: `Rapò Semènèl - ${seller.store_name || seller.full_name}`,
          html: html,
          data: { seller_id: seller.id },
        }),
      })

      // Store notification
      await supabase.from('notifications').insert({
        seller_id: seller.id,
        type: 'weekly_report',
        title: 'Rapò Semènèl',
        message: html,
        data: { totalProducts, newProducts, boostedProducts, newReviews, avgRating },
        is_read: false,
      })
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Weekly reports sent to all sellers' }),
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
