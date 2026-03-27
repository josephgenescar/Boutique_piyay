exports.handler = async (event, context) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Kle API a manke." }) };
  }

  try {
    const { message, catalog } = JSON.parse(event.body);

    // Nou prepare lis pwodwi yo pou AI a ka konprann yo byen
    const catalogSummary = (catalog || []).map(p =>
        `- ${p.title} (Pri: ${p.price}, Link: ${p.url}, Deskripsyon: ${p.description})`
    ).join("\n");

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
            content: `Ou se asistan pwofesyonèl Boutique Piyay. Ou konnen tout pwodwi nou gen nan boutik la.

            KATALÒG PWODWI NOU YO:
            ${catalogSummary || "Pa gen pwodwi disponib pou kounye a."}

            RÈG POU REKOMANDASYON:
            1. Si yon kliyan mande yon pwodwi oswa mande kisa nou genyen, chèche nan KATALÒG la epi rekòmande sa k pi byen koresponn lan.
            2. Lè w ap rekòmande yon pwodwi, bay NON an, PRI a, epi eksplike poukisa li bon.
            3. Toujou mete lyen pwodwi a (url) pou kliyan an ka klike sou li.
            4. Pale yon Kreyòl natirèl, cho, ak pwofesyonèl.
            5. Si nou pa gen yon pwodwi espesifik, di kliyan an nou pa genyen l pou kounye a men sijere l yon lòt bagay ki sanble.`
          },
          { role: "user", content: message }
        ],
        temperature: 0.6
      })
    });

    const data = await response.json();

    if (!response.ok) {
        return { statusCode: response.status, body: JSON.stringify(data) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erè nan sèvè: " + err.message }),
    };
  }
};
