const axios = require('axios');

exports.handler = async (event, context) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API Key missing" }) };
  }

  try {
    const { message, catalog } = JSON.parse(event.body);

    // Nou voye done reyèl yo sèlman
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

            RÈG STRIK:
            1. Sèvi ak done ki nan KATALÒG la SÈLMAN. Pa envante pri, pa envante pwodwi.
            2. Reponn kout, senp, epi dirèk an Kreyòl. Pa fè diskou.
            3. Pou chak pwodwi, sèvi ak fòma sa a: [PRODUCT: Tit | Pri | Lyen | Imaj | Machann Boutique Piyay]
            4. Toujou mete "Machann Boutique Piyay" kòm non machann nan pou sekirite.

            KATALÒG REYÈL:
            ${catalogSummary}`
          },
          { role: "user", content: message }
        ],
        temperature: 0.0, // Zero pou l pa janm envante anyen
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
