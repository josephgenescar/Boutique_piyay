const axios = require('axios');

exports.handler = async (event, context) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API Key missing" }) };
  }

  try {
    const { message, catalog } = JSON.parse(event.body);

    const catalogSummary = (catalog && catalog.length > 0)
        ? catalog.map(p => `- ${p.title} | Pri: ${p.price} | Lyen: ${p.url} | Imaj: ${p.image}`).join("\n")
        : "PA GEN PWODWI NAN LIS LA.";

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
            content: `Ou se "Piyay AI", asistan Boutique Piyay.

            RÈG STRIK POU AFICHE PWODWI (PA JANM CHANJE SA):
            Lè w ap montre yon pwodwi, ou DWE itilize fòma egzak sa a, san mete etikèt tankou "Tit:" oswa "Pri:":
            [PRODUCT: Non Pwodwi | Pri | URL Lyen | URL Imaj | Machann Boutique Piyay]

            EGZANP BON FÒMA:
            [PRODUCT: Robe Rouge | 4589 HTG | https://site.com/p1 | https://imagekit.io/img1.jpg | Machann Boutique Piyay]

            Pwen enpòtan:
            1. Toujou itilize mo "PRODUCT" anndan krichèt la [ ]. Pa janm ranplase l ak non pwodwi a.
            2. Pa mete mo "Lyen:" oswa "Imaj:" anndan krichèt la. Mete valè yo sèlman.
            3. Reponn kout an Kreyòl.

            KATALÒG REYÈL:
            ${catalogSummary}`
          },
          { role: "user", content: message }
        ],
        temperature: 0.0,
        max_tokens: 500
      })
    });

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
