const axios = require('axios');
// Nou pa bezwen supabase isit la si nou sèlman ap resevwa alèt la,
// men li pi bon pou nou mete l pou nou ka chanje status kòmand lan nan baz done a otomatikman.

exports.handler = async (event) => {
    // MonCash voye yon POST sou lyen sa a
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const payload = JSON.parse(event.body);
        console.log("🔔 MONCASH WEBHOOK RECEIVIED:", payload);

        // Payload MonCash la gen ladan l 'v' (transaction_id), 'o' (order_id), elatriye.
        const orderId = payload.o || payload.order_id;
        const transactionId = payload.v || payload.transaction_id;

        if (orderId) {
            // Isit la nou ta ka rele Supabase pou nou mete status 'paid' otomatikman
            // san nou pa menm tann kliyan an tounen sou paj merci a.
            console.log(`✅ Kòmand ${orderId} konfime pa Webhook. Tranzaksyon: ${transactionId}`);
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
