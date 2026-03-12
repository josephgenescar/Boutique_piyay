const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

exports.handler = async (event) => {
  const path = event.path.split('/').pop();
  const method = event.httpMethod;
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (method === 'OPTIONS') return { statusCode: 204, headers };

  try {
    // Verifikasyon JWT Auth (Senplifye pou egzanp lan, ou dwe itilize supabase.auth.getUser)
    const authHeader = event.headers.authorization;
    if (!authHeader) throw new Error("Pa otorize");

    // N ap sipoze ou voye User ID a nan yon fason sekirize (nan yon pwojè reyèl, verifye JWT a)
    // Pou kounye a, nou bezwen verifye token an via Supabase API si nou vle 100% sekirite.
    const userId = event.queryStringParameters.userId; // Atansyon: Nan prod, rale sa nan JWT a!

    // 1. GET /api/wallet/me
    if (method === 'GET' && path === 'me') {
      const [wallet] = await sql`SELECT * FROM wallets WHERE user_id = ${userId}`;
      return { statusCode: 200, headers, body: JSON.stringify(wallet) };
    }

    // 2. GET /api/wallet/transactions
    if (method === 'GET' && path === 'transactions') {
      const transactions = await sql`
        SELECT t.*, o.product_title
        FROM transactions t
        LEFT JOIN orders o ON t.order_id = o.id
        WHERE t.wallet_id = (SELECT id FROM wallets WHERE user_id = ${userId})
        ORDER BY t.created_at DESC LIMIT 50`;
      return { statusCode: 200, headers, body: JSON.stringify(transactions) };
    }

    // 3. POST /api/wallet/withdraw
    if (method === 'POST' && path === 'withdraw') {
      const { amount } = JSON.parse(event.body);
      if (amount < 500) throw new Error("Minimòm retrè se 500 HTG");

      const [wallet] = await sql`SELECT balance, id FROM wallets WHERE user_id = ${userId}`;
      if (wallet.balance < amount) throw new Error("Balans ensifizan");

      // Tranzaksyon SQL pou retrè
      await sql.begin(async sql => {
        await sql`UPDATE wallets SET balance = balance - ${amount}, total_withdrawn = total_withdrawn + ${amount} WHERE id = ${wallet.id}`;
        await sql`INSERT INTO transactions (wallet_id, type, amount, status, description) VALUES (${wallet.id}, 'withdrawal', ${amount}, 'pending', 'Demann retrè')`;
      });

      return { statusCode: 200, headers, body: JSON.stringify({ message: "Demann retrè voye!" }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: "Route not found" }) };
  } catch (err) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: err.message }) };
  }
};
