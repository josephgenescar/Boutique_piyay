const axios = require('axios');

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { amount, orderId } = JSON.parse(event.body);

        const CLIENT_ID = process.env.MONCASH_CLIENT_ID;
        const CLIENT_SECRET = process.env.MONCASH_CLIENT_SECRET;

        if (!CLIENT_ID || !CLIENT_SECRET) {
            return { statusCode: 500, body: JSON.stringify({ error: "Kle MonCash yo manke nan Netlify (Environment Variables)" }) };
        }

        const IS_SANDBOX = true;
        const baseURL = IS_SANDBOX
            ? "https://sandbox.moncashbutton.digicelgroup.com/Api"
            : "https://moncashbutton.digicelgroup.com/Api";

        // 1. JWENN TOKEN (Authorization)
        const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

        const tokenResponse = await axios({
            method: 'post',
            url: `${baseURL}/oauth/token?grant_type=client_credentials`,
            headers: { 'Authorization': `Basic ${auth}` }
        });

        const accessToken = tokenResponse.data.access_token;

        // 2. KREYE PEMAN
        const paymentResponse = await axios({
            method: 'post',
            url: `${baseURL}/v1/CreatePayment`,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            data: {
                amount: parseFloat(amount),
                orderId: String(orderId)
            }
        });

        const token = paymentResponse.data.payment_token.token;
        const redirectURL = IS_SANDBOX
            ? `https://sandbox.moncashbutton.digicelgroup.com/MonCash-middleware/Checkout/${token}`
            : `https://moncashbutton.digicelgroup.com/MonCash-middleware/Checkout/${token}`;

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ redirectURL })
        };

    } catch (error) {
        let msg = "Erè koneksyon ak MonCash";
        if (error.response && error.response.data) {
            console.error("DEBUG MonCash:", error.response.data);
            msg = error.response.data.error_description || error.response.data.message || msg;
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ error: msg })
        };
    }
};
