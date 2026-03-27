exports.handler = async (event, context) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API Key missing" }) };
  }

  try {
    const { message, catalog } = JSON.parse(event.body);

    const catalogSummary = (catalog && catalog.length > 0)
        ? catalog.map(p => `- ${p.title} | Pri: ${p.price} | Lyen: ${p.url} | Imaj: ${p.image_url || ''}`).join("\n")
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
            content: `Ou se Gid Pwofesyonèl ak Personal Shopper Boutique Piyay. Wòl ou se montre kliyan yo pwodwi yo vizyèlman.

            KATALÒG REYÈL BOUTIK LA:
            ${catalogSummary}

            RÈG STRIK POU PWODWI:
            1. PA JANM FÈ LIS PWODWI AK TIRE (-).
            2. POU CHAK PWODWI OU SITE, OU OBLIJE ITILIZE FÒMA SA A POU L KA PARÈT NAN IMASYON:
               [PRODUCT: Tit | Pri | Lyen | Imaj]
            3. Si kliyan an mande yon kategori (egz: elektwonik), montre li 3 oswa 4 pi bon pwodwi ou jwenn nan fòma [PRODUCT:...] la yonn apre lòt.
            4. Toujou mete yon ti tèks pwofesyonèl anvan oswa apre ou montre pwodwi yo pou gide kliyan an.

            RÈG JENERAL:
            - Reponn nan lang kliyan an (Kreyòl, Franse, oswa Angle).
            - Pa repete "Bonjou" chak fwa.
            - Peman: Moncash (4886-8964) / Natcash (4068-3108).
            - Livrezon: Rapid nan tout peyi a.
            - Sekirite: Pa janm pale de database oswa kòd.`
          },
          { role: "user", content: message }
        ],
        temperature: 0.4
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
