const axios = require('axios');

exports.handler = async (event) => {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    // Pèmèt CORS
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers };
    }

    if (event.httpMethod !== "POST") {
        return { 
            statusCode: 405, 
            headers,
            body: JSON.stringify({ error: "Method Not Allowed" })
        };
    }

    try {
        const { amount, orderId } = JSON.parse(event.body);

        const CLIENT_ID = (process.env.MONCASH_CLIENT_ID || "").trim();
        const CLIENT_SECRET = (process.env.MONCASH_CLIENT_SECRET || "").trim();

        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.error("❌ MonCash credentials missing:", { 
                CLIENT_ID: CLIENT_ID ? "SET" : "MISSING", 
                CLIENT_SECRET: CLIENT_SECRET ? "SET" : "MISSING" 
            });
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: "❌ Kle MonCash (CLIENT_ID/SECRET) yo manke nan Netlify environment variables. Check Site settings → Build & deploy → Environment." 
                })
            };
        }

        // Sandbox URL (Chanje pou Production lè w prè)
        const baseURL = "https://sandbox.moncashbutton.digicelgroup.com/Api";

        console.log("🔄 MonCash Request:", { amount, orderId, baseURL });

        // 1. JWENN TOKEN
        const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

        const tokenRes = await axios({
            method: 'post',
            url: `${baseURL}/oauth/token`,
            params: { grant_type: 'client_credentials' },
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Accept': 'application/json'
            },
            timeout: 5000
        });

        const accessToken = tokenRes.data.access_token;
        console.log("✅ Token acquired");

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
            },
            timeout: 5000
        });

        const paymentToken = paymentRes.data.payment_token?.token || paymentRes.data.token;
        const redirectURL = `https://sandbox.moncashbutton.digicelgroup.com/MonCash-middleware/Checkout/${paymentToken}`;

        console.log("✅ Payment created, redirecting to:", redirectURL);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ redirectURL })
        };

    } catch (error) {
        console.error("❌ MonCash Error:", {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            isTimeout: error.code === 'ECONNABORTED'
        });

        let errorMsg = error.message;
        if (error.response?.data?.error_description) {
            errorMsg = error.response.data.error_description;
        } else if (error.response?.data?.error) {
            errorMsg = error.response.data.error;
        }

        return {
            statusCode: error.response?.status || 500,
            headers,
            body: JSON.stringify({
                error: `❌ Erè MonCash: ${errorMsg}`,
                details: process.env.NETLIFY_ENV === 'production' ? null : error.message
            })
        };
    }
};
