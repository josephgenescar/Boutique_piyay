const axios = require('axios');

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { orderId } = JSON.parse(event.body);
        const CLIENT_ID = (process.env.MONCASH_CLIENT_ID || "").trim();
        const CLIENT_SECRET = (process.env.MONCASH_CLIENT_SECRET || "").trim();
        const baseURL = "https://sandbox.moncashbutton.digicelgroup.com/Api";

        // 1. JWENN TOKEN
        const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const tokenRes = await axios({
            method: 'post',
            url: `${baseURL}/oauth/token`,
            params: { grant_type: 'client_credentials' },
            headers: { 'Authorization': `Basic ${authHeader}`, 'Accept': 'application/json' }
        });
        const accessToken = tokenRes.data.access_token;

        // 2. VERIFYE TRANZAKSYON AN
        const verifyRes = await axios({
            method: 'post',
            url: `${baseURL}/v1/RetrieveTransactionByOrderId`,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            data: { orderId: String(orderId) }
        });

        // MonCash ap reponn ak detay tranzaksyon an
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(verifyRes.data)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.response?.data || error.message })
        };
    }
};
