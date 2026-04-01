exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { amount, orderId } = JSON.parse(event.body);
        const CLIENT_ID = process.env.MONCASH_CLIENT_ID;
        const CLIENT_SECRET = process.env.MONCASH_CLIENT_SECRET;

        if (!CLIENT_ID || !CLIENT_SECRET) {
            return { statusCode: 500, body: JSON.stringify({ error: "Kle MonCash yo manke nan Netlify." }) };
        }

        const baseURL = "https://sandbox.moncashbutton.digicelgroup.com/Api";

        // 1. JWENN TOKEN
        const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const tokenRes = await fetch(`${baseURL}/oauth/token?grant_type=client_credentials`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}` }
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            return { statusCode: 401, body: JSON.stringify({ error: "Echèk Login MonCash: " + (tokenData.error_description || "Kle yo pa bon") }) };
        }

        const accessToken = tokenData.access_token;

        // 2. KREYE PEMAN
        const paymentRes = await fetch(`${baseURL}/v1/CreatePayment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: parseFloat(amount),
                orderId: String(orderId)
            })
        });

        const paymentData = await paymentRes.json();

        if (paymentRes.status !== 202 && paymentRes.status !== 200) {
            return { statusCode: 400, body: JSON.stringify({ error: paymentData.message || "MonCash refize peman an" }) };
        }

        const token = paymentData.payment_token.token;
        const redirectURL = `https://sandbox.moncashbutton.digicelgroup.com/MonCash-middleware/Checkout/${token}`;

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ redirectURL })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Erè teknik: " + error.message })
        };
    }
};
