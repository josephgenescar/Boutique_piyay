const postgres = require("postgres");

exports.handler = async () => {
  const sql = postgres(process.env.DATABASE_URL);

  try {
    const result = await sql`SELECT NOW()`;
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: err.toString(),
    };
  }
};
