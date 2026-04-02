const axios = require('axios');

exports.handler = async (event, context) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API Key missing" }) };
  }

  try {
    const { message, catalog } = JSON.parse(event.body);

    const catalogSummary = (catalog && catalog.length > 0)
        ? catalog.map(p => `- ${p.title} | Pri: ${p.price} | Machann: ${p.seller} | Lyen: ${p.url} | Imaj: ${p.image}`).join("\n")
        : "PA GEN PWODWI NAN LIS LA POU KOUNYE A.";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `Ou se "Piyay AI", asistan Boutique Piyay. Wòl ou se fè PWOMOSYON pou machann nou yo.

            KATALÒG PWODWI:
            ${catalogSummary}

            RÈG PWOMOSYON (STRIK):
            1. Pou chak pwodwi ou jwenn, ou DWE di non machann oswa boutik ki genyen l lan. Egzanp: "Mwen jwenn bèl rad sa a nan boutik [Non Machann]..."
            2. Toujou ankouraje kliyan an vizite boutik machann nan.
            3. Itilize fòma sa a pou afiche pwodwi a:
               [PRODUCT: Tit | Pri | Lyen | Imaj | Non Machann]

            Reponn an Kreyòl yon fason ki amikal epi ki bay machann yo valè.`
          },
          { role: "user", content: message }
        ],
        temperature: 0.4,
        max_tokens: 1000
      })
    });

    const data = await response.json();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error("AI Function Error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
