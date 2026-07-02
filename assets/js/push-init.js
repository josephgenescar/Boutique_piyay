const PUSH_REGISTRATION_URL = "/.netlify/functions/push-registration";
const VAPID_KEY_URL = "/.netlify/functions/vapid-public";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

function getPlatform() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  return "web";
}

async function savePushSubscription(subscription) {
  try {
    const userResult = window.supabase?.auth ? await window.supabase.auth.getUser() : { data: { user: null } };
    const userId = userResult?.data?.user?.id || null;
    const body = {
      subscription: subscription.toJSON(),
      user_id: userId,
    };

    const response = await fetch(PUSH_REGISTRATION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Push registration failed: ${response.status} ${response.statusText} - ${text}`);
    }
    console.log("Push subscription saved.");
  } catch (err) {
    console.warn("Push subscription save failed:", err);
  }
}

async function initPushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("Push notification permission declined or not granted.");
        return;
      }

      const response = await fetch(VAPID_KEY_URL);
      if (!response.ok) {
        console.warn("Could not load VAPID public key.");
        return;
      }

      const data = await response.json();
      if (!data.publicKey) {
        console.warn("No VAPID public key returned.");
        return;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    if (subscription) {
      await savePushSubscription(subscription);
    }
  } catch (err) {
    console.warn("Push initialization failed:", err);
  }
}

window.addEventListener("load", initPushNotifications);
