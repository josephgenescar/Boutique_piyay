const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://letyferfjpxmstohvgcj.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const payload = JSON.parse(event.body);
        console.log("🔔 MONCASH WEBHOOK RECEIVIED:", payload);

        const orderId = payload.o || payload.order_id;
        const transactionId = payload.v || payload.transaction_id;

        if (orderId) {
            console.log(`✅ Kòmand ${orderId} konfime pa Webhook. Tranzaksyon: ${transactionId}`);

            if (supabase) {
                const { error } = await supabase
                    .from('orders')
                    .update({ status: 'paid', updated_at: new Date().toISOString() })
                    .eq('order_group_id', orderId);

                if (error) {
                    console.error('Webhook Supabase update error:', error);
                }
            } else {
                console.warn('Webhook pa gen SUPABASE_SERVICE_ROLE_KEY oswa SUPABASE_ANON_KEY. Pa t ka mete ajou baz done.');
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Sikse" })
        };
    } catch (err) {
        console.error("❌ Webhook Error:", err);
        return { statusCode: 500, body: "Error" };
    }
};
