let productCatalog = [];

// Chaje katalòg pwodwi yo depi sit la louvri
async function loadCatalog() {
    try {
        const response = await fetch('/search.json');
        productCatalog = await response.json();
        console.log("Katalòg chaje ak success:", productCatalog.length, "pwodwi.");
    } catch (e) {
        console.error("Erè nan chaje katalòg:", e);
    }
}

async function askPiyayAI(message) {
    try {
        const response = await fetch("/.netlify/functions/ai-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: message,
                catalog: productCatalog.slice(0, 50) // Voye yon pati nan katalòg la pou l pa twò lou
            })
        });

        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error?.message || "Erè enkoni");

        return data.choices[0].message.content;
    } catch (err) {
        console.error("Erè nan askPiyayAI:", err);
        throw err;
    }
}

function renderAIResponse(text) {
    const chatBody = document.getElementById('ai-chat-body');

    // Detekte si gen yon referans pwodwi nan repons lan (egz: [PROD:123])
    // Pou kounye a, n ap jis mete tèks la, men nou ka ajoute bèl UI kat la isit la
    let formattedText = text;

    chatBody.innerHTML += `<div style="margin-bottom:15px;"><span style="background:#f1f5f9; color:#333; padding:10px 15px; border-radius:18px; font-size:14px; display:inline-block; border:1px solid #ddd; line-height:1.5;">${formattedText}</span></div>`;
}

async function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const msg = input.value.trim();
    if (!msg) return;

    const chatBody = document.getElementById('ai-chat-body');
    chatBody.innerHTML += `<div style="margin-bottom:10px; text-align:right;"><span style="background:#ff4747; color:white; padding:8px 12px; border-radius:15px; font-size:13px; display:inline-block;">${msg}</span></div>`;
    input.value = '';

    const loadingId = "loading-" + Date.now();
    chatBody.innerHTML += `<div id="${loadingId}" style="margin-bottom:10px;"><span style="background:#eee; padding:8px 12px; border-radius:15px; font-size:13px; display:inline-block;">⏳ M ap chèche pou ou...</span></div>`;
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const aiResponse = await askPiyayAI(msg);
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();
        renderAIResponse(aiResponse);
    } catch (e) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.innerHTML = `<span style="color:red; font-size:12px;">Erè: ${e.message}</span>`;
    }
    chatBody.scrollTop = chatBody.scrollHeight;
}

window.addEventListener('DOMContentLoaded', () => {
    loadCatalog();
    setTimeout(() => {
        const box = document.getElementById('ai-chat-box');
        if (box && (box.style.display === 'none' || box.style.display === '')) {
            box.style.display = 'flex';
        }
    }, 3000);

    const aiInput = document.getElementById('ai-input');
    if (aiInput) {
        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendAIMessage();
        });
    }
});
