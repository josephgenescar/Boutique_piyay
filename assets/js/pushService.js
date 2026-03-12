// ============================================================
//  PiyayChat — Web Push Service (San Firebase)
//  Itilize Web Push API natif + VAPID keys
//  Tout done nan Supabase sèlman
// ============================================================

import { supabase } from "./supabase";

// ── Konvèti VAPID public key ────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// ── Mande pèmisyon ak anrejistre subscription ───────────────
export async function registerPushSubscription(userId) {
  try {
    // 1. Verifye si browser sipòte Web Push
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Browser pa sipòte Web Push");
      return null;
    }

    // 2. Mande pèmisyon
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Itilizatè refize notifikasyon");
      return null;
    }

    // 3. Anrejistre Service Worker
    const registration = await navigator.serviceWorker.register(
      "/sw-notifications.js",
      { scope: "/" }
    );
    await navigator.serviceWorker.ready;

    // 4. Kreye Push Subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      ),
    });

    // 5. Sove subscription nan Supabase
    const subData = subscription.toJSON();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: subData.endpoint,
        p256dh: subData.keys?.p256dh,
        auth: subData.keys?.auth,
        platform: getPlatform(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" }
    );

    if (error) throw error;
    console.log("Push subscription anrejistre ✅");
    return subscription;
  } catch (err) {
    console.error("Erè anrejistreman push:", err);
    return null;
  }
}

// ── Retire subscription lè dekonekte ───────────────────────
export async function unregisterPushSubscription(userId) {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", subscription.endpoint);
    }
  } catch (err) {
    console.error("Erè retire subscription:", err);
  }
}

// ── Koute notifikasyon an tan reyèl (Supabase Realtime) ─────
export function subscribeToNotifications(userId, onNew) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onNew(payload.new)
    )
    .subscribe();
}

// ── Jwenn istwa notifikasyon ────────────────────────────────
export async function getNotificationHistory(userId, limit = 40) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) { console.error(error); return []; }
  return data;
}

// ── Make kòm li ─────────────────────────────────────────────
export async function markAsRead(notificationId) {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
}

export async function markAllAsRead(userId) {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
}

// ── Platfòm ─────────────────────────────────────────────────
function getPlatform() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  return "web";
}
