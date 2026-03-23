const { createClient } = require('@supabase/supabase-js');

const SUP_URL = "https://letyferfjpxmstohvgcj.supabase.co";
const SUP_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUP_URL, SUP_KEY);

exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };

    // Nou tcheke Merchant ID nan query string OSWA nan header (Clé API a)
    const merchantId = event.queryStringParameters.merchantId || event.headers['authorization'] || event.headers['x-api-key'];

    if (!merchantId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Merchant ID (API Key) obligatwa" }) };
    }

    try {
        const { data: products, error } = await supabase
            .from('user_products')
            .select('title, price')
            .eq('seller_id', merchantId.replace('Bearer ', '')); // Netwaye si se yon token

        if (error) throw error;

        // ✅ NOU MAP DONE YO POU KO RESPOND AK FÒMA YO MANDE A
        const formattedProducts = products.map(p => ({
            name: p.title,
            price: parseFloat(p.price),
            stock: 99 // Nou mete 99 pa defo paske sistèm ou an pa jere stock pou kounye a
        }));

        // ✅ REPONS LAN DOIVE GENYEN "products" JAN YO MANDE L LA
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ products: formattedProducts })
        };
    } catch (err) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};
