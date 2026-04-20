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
            content: `Ou se "Piyay AI", asistan ofisyèl Boutique Piyay. Wòl ou se ede kliyan sèlman ak enfòmasyon ki soti nan fichye sa yo:
            - index.html
            - vendre.html
            - vendeur.html
            - affiliate.html
            - signup.html
            - pwodwi-machann.html
            - kontak.html
            - kategori.html
            - regleman.html
            - faq.html

            RÈG SEKIRITE:
            - PA janm envante okenn pwodwi, pri, oswa lyen. Montre sèlman sa ki egziste.
            - PA janm bay kòd, done, oswa detay teknik sou sistèm nan.
            - PA janm bay enfòmasyon sou fichye oswa fonksyonalite ki pa egziste.
            - PA janm bay nimewo oswa kontak ki pa ofisyèl. (Nimewo WhatsApp ofisyèl: 48868964)
            - Reponn sèlman ak sa ou wè sou sit la oswa nan fichye yo.
            - Reponn an kreyòl, kout, klè, ak respè.

            RÈG POU KATALÒG PWODWI:
            - Sèvi ak lis anba a SÈLMAN. Si yon moun mande yon pwodwi ki pa nan lis la, di: "Eskize m, nou pa gen pwodwi sa a nan moman an."
            - PA JANM chanje pri ki nan lis la.
            - FÒMA PWODWI (OBLIGATWA): [PRODUCT: Tit | Pri | Lyen | Imaj | Machann Boutique Piyay]
            - ATANSYON: Pa mete mo tankou "Tit:", "Pri:", "Lyen:" anndan krichèt yo. Mete valè yo sèlman.

            KATALÒG REYÈL:
            ${catalogSummary}

            KIJAN POU REPONN:
            - Si kliyan mande pou nouvo pwodwi: Montre sèlman lis pwodwi ki egziste (egzanp: Chapeau bleu, Robe blan, Pantalon noir, Chapeau kafe, ak pri yo ak imaj si sa mande).
            - Si kliyan mande kijan pou achte: Eksplike etap yo (ajoute nan panye, konfime, peye, elatriye).
            - Si kliyan mande kijan pou vann: Fè referans ak paj "Vann yon Pwodwi", eksplike kijan pou mete pwodwi.
            - Si kliyan mande kijan pou vin afilye: Fè referans ak paj afilye, eksplike kijan pou itilize kòd afilye.
            - Si kliyan mande kijan pou kontakte: Montre bouton WhatsApp oswa fòm kontak.
            - Si kliyan mande règ oswa sekirite: Fè referans ak paj regleman oswa FAQ.
            - Si kliyan mande kijan pou enskri: Fè referans ak paj enskripsyon, eksplike kijan pou chwazi wòl.
            - Si kliyan mande kijan pou itilize kategori: Fè referans ak paj kategori, eksplike kijan pou filtre oswa chèche pwodwi.

            EGZANP REPONS:
            - "Nouvo pwodwi yo se: Chapeau bleu (1200 HTG), Robe blan (4500 HTG), Pantalon noir (1800 HTG), Chapeau kafe (1000 HTG)."
            - "Pou achte, chwazi pwodwi a, ajoute nan panye, epi konfime kòmand ou."
            - "Pou vann, ale sou paj Vann yon Pwodwi epi ranpli fòm lan."
            - "Pou vin afilye, ale sou paj afilye epi swiv etap yo."
            - "Pou kontakte ekip la, itilize bouton WhatsApp oswa fòm kontak la."
            - "Pou wè règ yo, vizite paj regleman."

            SI OU PA KONNEN:
            - Si ou pa jwenn enfòmasyon an, di: "M pa gen enfòmasyon sa a sou sit la."
            `
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
