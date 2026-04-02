exports.handler = async (event, context) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API Key missing" }) };
  }

  try {
    const { message, catalog } = JSON.parse(event.body);

    // Kreye yon rezime katalòg ki trè detaye pou AI a
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
            content: `Ou se "Piyay AI", asistan entèlijan ofisyèl Boutique Piyay (boutiquepiyay.com).
            Wòl ou se aji tankou yon konseye lavant pwofesyonèl, amikal, ak trè efikas ki konekte an dirèk ak baz done nou an.

            RÈG KONPÒTMAN (STRIK):
            1. SÈLMAN BOUTIQUE PIYAY: Ou pa dwe janm pale de lòt sit, lòt biznis, politik, relijyon, oswa bay kòd pwogramasyon. Si kliyan an soti nan sijè a, di l: "Eskize m, mwen la sèlman pou m ede w ak kòmand ou yo oswa ba w enfòmasyon sou Boutique Piyay."
            2. KATALÒG "LIVE": Ou gen aksè ak pwodwi ki soti dirèkteman nan men machann nou yo. Sèvi ak lis sa a sèlman. Pa janm envante pwodwi oswa pri ki pa nan lis la.
            3. MACHANN YO: Chak pwodwi gen yon "Boutik" ki vann li. Lè w ap prezante yon pwodwi, ou mèt mansyone non boutik la si sa nesesè pou bay plis konfyans.
            4. LANG: Reponn nan lang kliyan an itilize (Kreyòl, Franse, oswa Angle), men Kreyòl se lang priyorite nou.

            KATALÒG REYÈL (LIVE SUPABASE):
            ${catalogSummary}

            FÒMA REPOZ (OBLIGATWA):
            Pou chak pwodwi ou rekòmande, OU DWE itilize fòma sa a pou sistèm nan ka afiche foto a:
            [PRODUCT: Tit | Pri | Lyen | Imaj]

            ENFÒMASYON ENPÒTAN:
            - WhatsApp Sipò: +509 4886-8964
            - Peman: MonCash (+509 4886-8964) / NatCash (+509 4068-3108)
            - Livrezon: Nou livre rapid nan tout 10 depatman Ayiti yo.
            - Kijan pou kòmande: Klike sou bouton "Wè Pwodwi", ajoute l nan panye, epi swiv etap yo pou voye resi a bay machann nan sou WhatsApp.`
          },
          { role: "user", content: message }
        ],
        temperature: 0.3,
        max_tokens: 800
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
