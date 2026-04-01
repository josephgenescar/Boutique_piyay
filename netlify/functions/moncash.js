const axios = require('axios');

exports.handler = async (event) => {
    // Sèlman aksepte POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        console.log("DEBUG: Kòmanse pwosesis MonCash...");
        const { amount, orderId } = JSON.parse(event.body);

        const CLIENT_ID = process.env.MONCASH_CLIENT_ID;
        const CLIENT_SECRET = process.env.MONCASH_CLIENT_SECRET;

        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.error("DEBUG: Kle yo manke nan Netlify Environment Variables");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Konfigirasyon manke: Kle MonCash yo pa jwenn nan Netlify." })
            };
        }

        const baseURL = "https://sandbox.moncashbutton.digicelgroup.com/Api";

        // 1. JWENN TOKEN (Oauth)
        console.log("DEBUG: Ap chèche Token nan men MonCash...");
        const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

        const tokenRes = await axios({
            method: 'post',
            url: `${baseURL}/oauth/token?grant_type=client_credentials`,
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Accept': 'application/json'
            }
        });

        const accessToken = tokenRes.data.access_token;
        console.log("DEBUG: Token jwenn avèk siksè.");

        // 2. KREYE PEMAN
        console.log(`DEBUG: Ap kreye peman pou ${amount} HTG (OrderID: ${orderId})...`);
        const paymentRes = await axios({
            method: 'post',
            url: `${baseURL}/v1/CreatePayment`,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            data: {
                amount: parseFloat(amount).toFixed(2),
                orderId: String(orderId)
            }
        });

        if (!paymentRes.data.payment_token || !paymentRes.data.payment_token.token) {
            console.error("DEBUG: MonCash pa voye Token peman an tounen.", paymentRes.data);
            throw new Error("MonCash pa voye konfimasyon peman an.");
        }

        const token = paymentRes.data.payment_token.token;
        const redirectURL = `https://sandbox.moncashbutton.digicelgroup.com/MonCash-middleware/Checkout/${token}`;

        console.log("DEBUG: Redirect URL pwè:", redirectURL);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ redirectURL })
        };

    } catch (error) {
        console.error("ERÈ MONCASH DETAYE:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data));
            return {
                statusCode: error.response.status,
                body: JSON.stringify({
                    error: error.response.data.error_description || error.response.data.message || "MonCash refize koneksyon an."
                })
            };
        } else {
            console.error("Message:", error.message);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Erè koneksyon: " + error.message })
            };
        }
    }
};
