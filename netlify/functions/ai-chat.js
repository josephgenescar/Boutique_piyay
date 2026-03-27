exports.handler = async (event, context) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Kle API a manke." }) };
  }

  try {
    const { message, catalog } = JSON.parse(event.body);

    const catalogSummary = (catalog || []).map(p =>
        `- ${p.title} | Pri: ${p.price} | Lyen: ${p.url} | Deskripsyon: ${p.description}`
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
            content: `Ou se asistan pwofesyonèl ak entelijan Boutique Piyay. Wòl ou se gide Kliyan, Machann, ak Afilye.

            MEN KATALÒG PWODWI KI DISPONIB YO (Ou dwe itilize sa yo sèlman pou reponn):
            ${catalogSummary || "Pa gen pwodwi nan lis la pou kounye a."}

            RÈG PWOFE SYONÈL:
            1. PALE KREYÒL AYISYEN NATIRÈL: Pa fè tradiksyon literal. Pa di "Mwen ede ke", di pito "Kijan mwen ka ede w?".
            2. DIFERANSYE WÒL YO:
               - SI SE YON MACHANN: Di l li ka ouvri yon kont pou l vann pwodwi l yo isit la: /signup.html (oswa /vendre.html).
               - SI SE YON AFILYE: Di l li ka fè kòb lè li pataje lyen nou yo. Gide l nan paj afilye a: /affiliate.html.
               - SI SE YON KLIYAN: Chèche pwodwi l ap mande a nan KATALÒG la. Bay li NON, PRI, ak LYEN an.
            3. LIVREZON AK PEMAN:
               - Livrezon soti Sen Domeng, li pran 3 a 5 jou.
               - Peman fèt pa Moncash (4886-8964) oswa Natcash (4068-3108).
            4. PWÈV KOMAND: Esplike kliyan an ke depi li fin peye, l ap resevwa yon FICH kòm prèv anvan nou livrel machandiz la. Se fich sa l ap montre pou l resevwa pwodwi a.
            5. KONSÈY: Si kliyan an ezite, ba li konsey sou pi bon pwodwi ki nan katalòg la selon bezwen l.
            6. SÈVIS KLIYAN: Si nou pa gen yon pwodwi, mande l si li vle nou chèche l pou li oswa sijere l yon lòt bagay ki sanble.`
          },
          { role: "user", content: message }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (!response.ok) return { statusCode: response.status, body: JSON.stringify(data) };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Erè sèvè." }) };
  }
};
