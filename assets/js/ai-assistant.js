const GROQ_API_KEY = "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"; // Ou mèt ranplase sa ak kle ou a

async function askPiyayAI(message) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "llama3-8b-8192",
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
    return data.choices[0].message.content;
}

function toggleAIChat() {
    const box = document.getElementById('ai-chat-box');
    // Verifikasyon pou asire l ap travay menm si style la nan CSS la sèlman
    if (box.style.display === 'none' || box.style.display === '') {
        box.style.display = 'flex';
    } else {
        box.style.display = 'none';
    }
}

async function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const msg = input.value.trim();
    if (!msg) return;

    const chatBody = document.getElementById('ai-chat-body');
    chatBody.innerHTML += `<div style="margin-bottom:10px; text-align:right;"><span style="background:#ff4747; color:white; padding:8px 12px; border-radius:15px; font-size:13px; display:inline-block;">${msg}</span></div>`;
    input.value = '';

    const loadingId = "loading-" + Date.now();
    chatBody.innerHTML += `<div id="${loadingId}" style="margin-bottom:10px;"><span style="background:#eee; padding:8px 12px; border-radius:15px; font-size:13px; display:inline-block;">⏳ M ap reflechi...</span></div>`;
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const aiResponse = await askPiyayAI(msg);
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();
        chatBody.innerHTML += `<div style="margin-bottom:10px;"><span style="background:#f1f5f9; color:#333; padding:8px 12px; border-radius:15px; font-size:13px; display:inline-block; border:1px solid #ddd;">${aiResponse}</span></div>`;
    } catch (e) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.innerHTML = `<span style="color:red; font-size:12px;">Erè koneksyon...</span>`;
    }
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Louvri chat la otomatikman apre 3 segonn pou akeyi kliyan an
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const box = document.getElementById('ai-chat-box');
        if (box && (box.style.display === 'none' || box.style.display === '')) {
            box.style.display = 'flex';
        }
    }, 3000);

    // Pèmèt voye mesaj ak bouton "Enter"
    const aiInput = document.getElementById('ai-input');
    if (aiInput) {
        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendAIMessage();
            }
        });
    }
});
