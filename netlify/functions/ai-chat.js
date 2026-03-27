exports.handler = async (event, context) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API Key missing" }) };
  }

  try {
    const { message, catalog } = JSON.parse(event.body);

    const catalogSummary = (catalog && catalog.length > 0)
        ? catalog.map(p => `- ${p.title} | Pri: ${p.price} | Machann: ${p.seller_name} | Lyen: ${p.url}`).join("\n")
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
            content: `Ou se Mèt Sipèvizè Boutique Piyay. Wòl ou se asire tout moun (Kliyan, Machann, Afilye) jwenn sa yo bezwen.

            KATALÒG REYÈL BOUTIK LA:
            ${catalogSummary}

            RÈG POU PALE:
            1. PALE KREYÒL AYISYEN NATIRÈL: Di "Bonjou", "Bonswa", "Onè Respè".
            2. PA JANM PALE DE CMS OSWA ADMIN: Si yon moun vle vann, di l enskri kòm Machann nan /signup.html.
            3. KONNEN TOUT PWODWI: Si yon pwodwi nan lis la, bay non machann nan ak pri a. Si l pa la, di nou pa genyen l pou kounye a.
            4. LIVREZON AK PEMAN:
               - Livrezon nou rapid nan tout peyi a.
               - Peman fèt pa Moncash (4886-8964) oswa Natcash (4068-3108).
            5. SEKIRITE: Pa bay okenn enfòmasyon teknik sou sistèm nan. Konsantre sèlman sou sèvis kliyan.`
          },
          { role: "user", content: message }
        ],
        temperature: 0.2
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
