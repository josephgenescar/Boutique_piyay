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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get unread notifications
    const { data: notifications, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching notifications:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No unread notifications' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sentCount = 0

    for (const notification of notifications) {
      try {
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
            subject: notification.title,
            html: notification.message || generateEmailFromNotification(notification),
            data: notification.data,
          }),
        })

        if (emailResponse.ok) {
          // Mark as read
          await supabase
            .from('admin_notifications')
            .update({ is_read: true })
            .eq('id', notification.id)
          
          sentCount++
        } else {
          console.error('Failed to send email for notification:', notification.id)
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${sentCount} of ${notifications.length} notifications` 
      }),
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

function generateEmailFromNotification(notification: any): string {
  const data = notification.data || {}
  
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
          <h1>🔔 Nouvo Notifikasyon</h1>
        </div>
        <div class="content">
          <p><strong>Tip:</strong> ${notification.type}</p>
          
          <div class="info-box">
            <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${JSON.stringify(data, null, 2)}</pre>
          </div>

          <p style="margin-top: 20px;">
            <a href="https://boutique-piyay.netlify.app/admin-stats.html" class="btn">Ale nan Dashboard</a>
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
