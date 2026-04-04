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
        : "PA GEN PWODWI NAN KATALÒG LA POU KOUNYE A.";

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
            content: `Ou se "Piyay AI", asistan ofisyèl Boutique Piyay (boutiquepiyay.site).
            Wòl ou se bay enfòmasyon EGZAT 100%. PA JANM ENVANTE ANYEN.

            SOUS DONE OFISYÈL:
            - WhatsApp Sipò: +509 4886-8964
            - Email: support@boutiquepiyay.site
            - Kijan pou moun vann: Klike sou "Vann pa w" nan meni an, kreye yon kont sou https://boutique-piyay.netlify.app/vendre.html.
            - Livrezon: Nou livre nan tout 10 depatman Ayiti yo.
            - Peman: MonCash, NatCash, oswa Peye lè w resevwa (selon machann nan).

            RÈG POU KATALÒG PWODWI:
            - Sèvi ak lis anba a SÈLMAN. Si yon moun mande yon pwodwi ki pa nan lis la, di: "Eskize m, nou pa gen pwodwi sa a nan moman an."
            - PA JANM chanje pri ki nan lis la.
            - FÒMA PWODWI (OBLIGATWA): [PRODUCT: Tit | Pri | Lyen | Imaj | Machann Boutique Piyay]
            - ATANSYON: Pa mete mo tankou "Tit:", "Pri:", "Lyen:" anndan krichèt yo. Mete valè yo sèlman.

            KATALÒG REYÈL:
            ${catalogSummary}

            RÈG KONPÒTMAN:
            - Si ou pa konnen yon repons, di kliyan an kontakte nou sou WhatsApp nan +509 4886-8964.
            - Reponn amikalman an Kreyòl, kout epi klè.`
          },
          { role: "user", content: message }
        ],
        temperature: 0.0, // Zero pèmèt li rete fidèl ak done yo sèlman
        max_tokens: 600
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
