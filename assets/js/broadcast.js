async function sendProductBroadcast(type, data) {
  try {
    if (!window.supabase?.auth) return;

    const { data: sessionData } = await window.supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;

    const response = await fetch("/.netlify/functions/broadcast-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type, data }),
    });

    const result = await response.json();
    console.log("Broadcast notification result:", result);
  } catch (err) {
    console.warn("Broadcast notification failed:", err);
  }
}

window.sendProductBroadcast = sendProductBroadcast;
