exports.handler = async (event, context) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Kle GROQ_API_KEY a manke sou Netlify." }),
    };
  }

  try {
    const { message } = JSON.parse(event.body);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // Nouvo modèl ki sipòte a
        messages: [
          {
            role: "system",
            content: "Ou se asistan entelijan Boutique Piyay. Ou pale Kreyòl Ayisyen sèlman. Ou ede kliyan yo jwenn pwodwi, esplike yo ke livrezon soti Sen Domeng pran 3-5 jou, epi peman fèt pa Moncash (4886-8964) oswa Natcash (4068-3108). Ou dwe toujou koutwazi epi bay repons ki kout."
          },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
        return {
            statusCode: response.status,
            body: JSON.stringify(data)
        };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erè nan sèvè Netlify: " + err.message }),
    };
  }
};
