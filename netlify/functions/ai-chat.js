exports.handler = async (event, context) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API Key missing" }) };
  }

  try {
    const { message, catalog } = JSON.parse(event.body);

    const catalogSummary = (catalog && catalog.length > 0)
        ? catalog.map(p => `- ${p.title} | Pri: ${p.price} | Lyen: ${p.url}`).join("\n")
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
            content: `Ou se Mèt Sipèvizè Boutique Piyay, asistan entelijan ki konnen tout sa k ap pase sou platfòm nan. Wòl ou se bay kliyan, machann, ak afilye enfòmasyon egzak.

            KATALÒG PWODWI REYÈL KI SOTI NAN DATABASE (SUPABASE):
            ${catalogSummary}

            GID REPONS POU PIBLIK LA:
            1. PALE KREYÒL NATIRÈL: Sèvi ak yon langaj pwofesyonèl, cho, ak respè (Bonjou, Bonswa, Onè Respè).
            2. PWODWI AK PRI: Si yon moun mande yon pwodwi, chèche l nan lis anwo a sèlman. Bay pri a ak lyen an. Si pwodwi a pa nan lis la, di: "Nou pa gen pwodwi sa a kounye a, men nou toujou ap ajoute nouvo bagay."
            3. PEMAN AK SEKIRITE: Eksplike ke peman fèt pa Moncash (4886-8964) oswa Natcash (4068-3108). Di kliyan an: "Depi w fin peye, w ap resevwa yon FICH kòm prèv. Se fich sa w ap montre pou w resevwa machandiz ou."
            4. LIVREZON: Nou fè livrezon rapid nan tout peyi a (Haiti).
            5. POU MACHANN: Si yon moun vle vann, di l enskri kòm Machann nan /signup.html oswa klike sou "Vann pa w".
            6. POU AFILYE: Moun ki vle fè kòb nan pataje lyen, voye yo nan /affiliate.html.
            7. KONTAK: Si yo bezwen pale ak yon moun dirèkteman, voye yo nan paj /kontak.html.
            8. RÈGLEMAN: Pou kesyon sou retou oswa kondisyon, gide yo nan /regleman.html.

            RÈG STRIK:
            - PA JANM ENVANTE PWODWI OWA PRI KI PA NAN LIS LA.
            - PA BAY ENFÒMASYON TEKNIK (DATABASE, CODE, CMS).
            - SI KESYON AN PA GEN RAPÒ AK BOUTIQUE PIYAY, REPONN AK RESPÈ KE OU LA SÈLMAN POU EDE YO SOU PLATFÒM NAN.`
          },
          { role: "user", content: message }
        ],
        temperature: 0.3
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
