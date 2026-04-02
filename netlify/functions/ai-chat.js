const axios = require('axios');

exports.handler = async (event, context) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API Key missing" }) };
  }

  try {
    const { message, catalog } = JSON.parse(event.body);

    // Kreye yon rezime katalòg trè klè pou AI a
    const catalogSummary = (catalog && catalog.length > 0)
        ? catalog.map(p => `- ${p.title} | Pri: ${p.price} | Boutik: ${p.seller} | Lyen: ${p.url} | Imaj: ${p.image}`).join("\n")
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
            content: `Ou se "Piyay AI", asistan entèlijan ofisyèl Boutique Piyay.
            Wòl ou se ede kliyan jwenn pwodwi nan katalòg nou an.

            KATALÒG REYÈL (LIVE):
            ${catalogSummary}

            RÈG ENPÒTAN POU FOTO AK PWODWI:
            Lè w ap prezante yon pwodwi, OU DWE ITILIZE FÒMA SA A SÈLMAN pou chak pwodwi (pa ekri anyen anplis nan liy sa a):
            [PRODUCT: Tit | Pri | Lyen | Imaj]

            Egzanp: [PRODUCT: iPhone 13 Pro | 45000 HTG | https://boutiquepiyay.com/p/123 | https://imagekit.io/img.jpg]

            Pa janm montre lyen URL la bay kliyan an nan tèks nòmal. Sèvi ak fòma [PRODUCT:...] la sèlman.
            Si yon pwodwi pa gen imaj, sèvi ak: /assets/images/logo.png

            Reponn amikalman an Kreyòl.`
          },
          { role: "user", content: message }
        ],
        temperature: 0.3,
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
