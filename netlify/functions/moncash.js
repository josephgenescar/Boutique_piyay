const axios = require('axios');

exports.handler = async (event) => {
    // Nou sèlman aksepte POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { amount, orderId } = JSON.parse(event.body);

        // 1. Rekipere Kle yo nan Environment Variables (Pita n ap mete yo nan Netlify)
        const CLIENT_ID = process.env.MONCASH_CLIENT_ID;
        const CLIENT_SECRET = process.env.MONCASH_CLIENT_SECRET;
        const IS_SANDBOX = true; // Chanje an false lè w ap pase Live

        const baseURL = IS_SANDBOX
            ? "https://sandbox.moncashbutton.digicelgroup.com/Api"
            : "https://moncashbutton.digicelgroup.com/Api";

        // 2. Jwenn Access Token nan men MonCash
        const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const tokenRes = await axios({
            method: 'post',
            url: `${baseURL}/oauth/token?grant_type=client_credentials`,
            headers: { 'Authorization': `Basic ${authHeader}` }
        });

        const accessToken = tokenRes.data.access_token;

        // 3. Kreye Peman an
        const paymentRes = await axios({
            method: 'post',
            url: `${baseURL}/v1/CreatePayment`,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            data: {
                amount: amount,
                orderId: orderId || Date.now().toString()
            }
        });

        // 4. Voye Redirect URL la bay sit la
        const redirectURL = IS_SANDBOX
            ? `https://sandbox.moncashbutton.digicelgroup.com/MonCash-middleware/Checkout/${paymentRes.data.payment_token.token}`
            : `https://moncashbutton.digicelgroup.com/MonCash-middleware/Checkout/${paymentRes.data.payment_token.token}`;

        return {
            statusCode: 200,
            body: JSON.stringify({ redirectURL })
        };

    } catch (error) {
        console.error("Erè MonCash:", error.response ? error.response.data : error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Echèk koneksyon ak MonCash" })
        };
    }
};
