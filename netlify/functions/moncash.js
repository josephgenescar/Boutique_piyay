const axios = require('axios');

exports.handler = async (event) => {
    // Pèmèt CORS
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            }
        };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { amount, orderId } = JSON.parse(event.body);

        const CLIENT_ID = (process.env.MONCASH_CLIENT_ID || "").trim();
        const CLIENT_SECRET = (process.env.MONCASH_CLIENT_SECRET || "").trim();

        if (!CLIENT_ID || !CLIENT_SECRET) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Kle MonCash (CLIENT_ID/SECRET) yo manke nan konfigirasyon Netlify." })
            };
        }

        // Sandbox URL (Chanje pou Production lè w prè)
        const baseURL = "https://sandbox.moncashbutton.digicelgroup.com/Api";

        // 1. JWENN TOKEN
        const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

        const tokenRes = await axios({
            method: 'post',
            url: `${baseURL}/oauth/token`,
            params: { grant_type: 'client_credentials' },
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Accept': 'application/json'
            }
        });

        const accessToken = tokenRes.data.access_token;

        // 2. KREYE PEMAN
        const paymentRes = await axios({
            method: 'post',
            url: `${baseURL}/v1/CreatePayment`,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            data: {
                amount: parseFloat(amount),
                orderId: String(orderId)
            }
        });

        const paymentToken = paymentRes.data.payment_token.token;
        const redirectURL = `https://sandbox.moncashbutton.digicelgroup.com/MonCash-middleware/Checkout/${paymentToken}`;

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ redirectURL })
        };

    } catch (error) {
        console.error("MonCash Error:", error.response ? error.response.data : error.message);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({
                error: "Erè MonCash: " + (error.response?.data?.error_description || error.message)
            })
        };
    }
};
