async function askPiyayAI(message) {
    try {
        // Nou rele pon an (Netlify Function) olye nou rele Groq dirèkteman
        const response = await fetch("/.netlify/functions/groq-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) throw new Error("Erè nan repons pon an.");

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("AI Error:", error);
        throw error;
    }
}

function toggleAIChat() {
    const box = document.getElementById('ai-chat-box');
    if (box) {
        box.style.display = (box.style.display === 'none' || box.style.display === '') ? 'flex' : 'none';
    }
}

async function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const msg = input.value.trim();
    if (!msg) return;

    const chatBody = document.getElementById('ai-chat-body');
    chatBody.innerHTML += `<div style="margin-bottom:10px; text-align:right;"><span style="background:#ff4747; color:white; padding:8px 12px; border-radius:15px; font-size:13px; display:inline-block; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">${msg}</span></div>`;
    input.value = '';

    const loadingId = "loading-" + Date.now();
    chatBody.innerHTML += `<div id="${loadingId}" style="margin-bottom:10px;"><span style="background:#eee; padding:8px 12px; border-radius:15px; font-size:13px; display:inline-block;">⏳ M ap reflechi...</span></div>`;
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const aiResponse = await askPiyayAI(msg);
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        chatBody.innerHTML += `<div style="margin-bottom:10px;"><span style="background:#f1f5f9; color:#333; padding:8px 12px; border-radius:15px; font-size:13px; display:inline-block; border:1px solid #ddd; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">${aiResponse}</span></div>`;
    } catch (e) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.innerHTML = `<span style="color:red; font-size:12px;">Erè koneksyon...</span>`;
    }
    chatBody.scrollTop = chatBody.scrollHeight;
}

// OTO-AKÈY: Depi paj la chaje, chat la ap louvri apre 3 segonn
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const box = document.getElementById('ai-chat-box');
        if (box && box.style.display === 'none') {
            toggleAIChat();
        }
    }, 3000);
});
