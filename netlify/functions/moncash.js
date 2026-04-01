const axios = require('axios');

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { amount, orderId } = JSON.parse(event.body);

        // 1. Netwaye kle yo (retire espas si genyen)
        const CLIENT_ID = process.env.MONCASH_CLIENT_ID ? process.env.MONCASH_CLIENT_ID.trim() : null;
        const CLIENT_SECRET = process.env.MONCASH_CLIENT_SECRET ? process.env.MONCASH_CLIENT_SECRET.trim() : null;

        if (!CLIENT_ID || !CLIENT_SECRET) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Kle MonCash yo pa jwenn nan Netlify." })
            };
        }

        const baseURL = "https://sandbox.moncashbutton.digicelgroup.com/Api";

        // 2. JWENN TOKEN (Oauth)
        // Nou itilize URLSearchParams pou asire fòma a kòrèk pou MonCash
        const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

        console.log("DEBUG: Ap mande Token...");
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

        // 3. KREYE PEMAN
        console.log(`DEBUG: Ap kreye peman ${amount} HTG...`);
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

        const token = paymentRes.data.payment_token.token;
        const redirectURL = `https://sandbox.moncashbutton.digicelgroup.com/MonCash-middleware/Checkout/${token}`;

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ redirectURL })
        };

    } catch (error) {
        console.error("ERÈ DETAYE:");
        if (error.response) {
            console.error("Data MonCash:", error.response.data);
            // Si se "Empty scope", se souvan paske Credentials yo toujou pa bon pou MonCash
            const errorMsg = error.response.data.error_description || error.response.data.message || "Credential MonCash ou yo pa kòrèk.";
            return {
                statusCode: error.response.status,
                body: JSON.stringify({ error: errorMsg })
            };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Erè koneksyon: " + error.message })
        };
    }
};
