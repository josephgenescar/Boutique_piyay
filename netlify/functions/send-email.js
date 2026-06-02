// ============================================================
//  Netlify Function: send-email.js
//  Voye email notifikasyon lè yon komand fet
//  Itilize: Supabase Auth Email API
// ============================================================

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

  try {
    // Itilize Supabase Auth pou voye email
    const { error } = await supabase.auth.admin.inviteUserByEmail({
      email: to,
      data: {
        subject,
        html
      }
    });

    if (error) {
      console.error("Supabase Auth error:", error);
      // Si Auth API pa mache, eseye yon lòt apwòch
      // Voye email dirèkteman lè l sèvi
      return { statusCode: 500, body: `Erè Supabase Auth: ${error.message}` };
    }

    console.log("Email envoye via Supabase Auth");
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("Erè voye email:", err);
    return { statusCode: 500, body: err.message };
  }
};
