// ============================================================
//  PiyayChat — notify.js
//  Voye notifikasyon an yon liy kòd depi nenpòt kote
// ============================================================

export async function sendNotification(userId, type, data = {}) {
  try {
    const res = await fetch("/.netlify/functions/send-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_SECRET,
      },
      body: JSON.stringify({ user_id: userId, type, data }),
    });
    return res.ok;
  } catch (err) {
    console.error("Erè notifikasyon:", err);
    return false;
  }
}

// ── Shortcut pou tout ka ─────────────────────────────────────
export const notify = {
  newOrder:          (sellerId, orderId, productName, amount) =>
    sendNotification(sellerId, "new_order", { order_id: orderId, product_name: productName, amount }),

  orderConfirmed:    (buyerId, orderId, deliveryTime) =>
    sendNotification(buyerId, "order_confirmed", { order_id: orderId, delivery_time: deliveryTime }),

  orderDelivered:    (buyerId, orderId) =>
    sendNotification(buyerId, "order_delivered", { order_id: orderId }),

  deliveryComing:    (buyerId, orderId, eta) =>
    sendNotification(buyerId, "delivery_coming", { order_id: orderId, eta }),

  commissionEarned:  (affiliateId, amount, orderId) =>
    sendNotification(affiliateId, "commission_earned", { amount, order_id: orderId }),

  paymentReceived:   (sellerId, amount, balance) =>
    sendNotification(sellerId, "payment_received", { amount, balance }),

  newMessage:        (recipientId, senderName, preview, conversationId) =>
    sendNotification(recipientId, "new_message", {
      sender_name: senderName, message_preview: preview, conversation_id: conversationId,
    }),

  flashSale:         (userId, productName, discount, duration, productId) =>
    sendNotification(userId, "flash_sale", { product_name: productName, discount, duration, product_id: productId }),

  withdrawalSuccess: (userId, amount, method) =>
    sendNotification(userId, "withdrawal_success", { amount, method }),
};

// ── EGZANP ────────────────────────────────────────────────────
// Nan wallet.js apre distribye komisyon:
//   await notify.commissionEarned(affiliateId, 75, orderId);
//
// Nan order handler apre nouvo kòmand:
//   await notify.newOrder(sellerId, order.id, "Rad wouj", 1500);
//
// Nan chat apre nouvo mesaj:
//   await notify.newMessage(recipientId, "Manmi Marie", "Bonjou...", convId);
