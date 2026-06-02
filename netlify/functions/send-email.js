// ============================================================
//  Netlify Function: send-email.js
//  Voye email notifikasyon lè yon komand fet
//  Itilize: Resend API pou voye email bay admin oswa vandè
// ============================================================

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || "Rivayo Boutique <noreply@boutique-piyay.net>";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { to, subject, html, type, data } = body;

  if (!to || !subject || !html) {
    return { statusCode: 400, body: "to, subject, et html obligatwa" };
  }

  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY environment variable");
    return { statusCode: 500, body: "Missing RESEND_API_KEY environment variable" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error:", errorText);
      return { statusCode: 500, body: `Resend API error: ${errorText}` };
    }

    const result = await response.json();
    console.log("Email sent successfully via Resend:", result);

    // Optional: save a notification record for seller/admin if data includes seller_id
    if (data?.seller_id) {
      await supabase.from("notifications").insert({
        seller_id: data.seller_id,
        user_id: data.user_id || null,
        type: type || "email",
        title: subject,
        message: html,
        data: data,
        is_read: false,
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: result }),
    };
  } catch (err) {
    console.error("Erè voye email:", err);
    return { statusCode: 500, body: err.message };
  }
};
