const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method Not Allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return respond(400, { error: 'Invalid JSON' });
  }

  const userId = body.user_id;
  if (typeof userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return respond(400, { error: 'A valid user_id is required.' });
  }

  const requiredEnvironment = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GMAIL_USER',
    'GMAIL_APP_PASSWORD',
    'ADMIN_EMAIL',
  ];
  const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);
  if (missingEnvironment.length) {
    console.error('Registration email configuration is missing:', missingEnvironment.join(', '));
    return respond(500, { error: 'Gmail SMTP is not configured.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.ADMIN_EMAIL.trim())) {
    console.error('ADMIN_EMAIL is not a valid email address.');
    return respond(500, { error: 'Gmail SMTP is not configured.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.GMAIL_USER.trim())) {
    console.error('GMAIL_USER is not a valid email address.');
    return respond(500, { error: 'Gmail SMTP is not configured.' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { transport: ws }
  );

  const { data: authResult, error: authError } = await supabase.auth.admin.getUserById(userId);
  const requestedRole = authResult?.user?.user_metadata?.role;
  if (authError || !authResult?.user || !['seller', 'affiliate'].includes(requestedRole)) {
    return respond(404, { error: 'Registration not found.' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) {
    console.error('Unable to load applicant profile for email:', profileError);
    return respond(500, { error: 'Unable to verify the applicant.' });
  }
  let application = null;
  if (requestedRole === 'seller') {
    const { data, error } = await supabase
      .from('vendor_applications')
      .select('email, full_name, shop_name, whatsapp_number, address, product_categories, product_description, status, created_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('Unable to load vendor application for email:', error);
      return respond(500, { error: 'Unable to verify the application.' });
    }
    application = data;
    if (!application || application.status !== 'pending' || profile?.role !== 'pending_seller') {
      return respond(404, { error: 'Pending seller application not found.' });
    }
  } else if (profile?.role !== 'affiliate') {
    return respond(404, { error: 'Registration not found.' });
  }

  const { error: claimError } = await supabase
    .from('registration_email_notifications')
    .insert({ user_id: userId, status: 'sending' });
  if (claimError) {
    if (claimError.code !== '23505') {
      console.error('Unable to record registration email attempt:', claimError);
      return respond(500, { error: 'Unable to prepare the registration email.' });
    }

    const { data: previousAttempt, error: previousAttemptError } = await supabase
      .from('registration_email_notifications')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();
    if (previousAttemptError) {
      console.error('Unable to check registration email status:', previousAttemptError);
      return respond(500, { error: 'Unable to check registration email status.' });
    }
    if (previousAttempt?.status === 'sent') {
      return respond(200, { success: true, already_sent: true });
    }
    if (previousAttempt?.status === 'sending') {
      return respond(409, { error: 'Registration email is already being sent.' });
    }

    const { data: retryClaim, error: retryError } = await supabase
      .from('registration_email_notifications')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'failed')
      .select('user_id')
      .maybeSingle();
    if (retryError || !retryClaim) {
      if (retryError) console.error('Unable to retry registration email:', retryError);
      return respond(409, { error: 'Registration email could not be retried.' });
    }
  }

  const applicant = authResult.user;
  const name = application?.full_name || applicant.user_metadata?.full_name || 'Pa bay';
  const email = application?.email || applicant.email || 'Pa bay';
  const details = requestedRole === 'seller'
    ? [
      ['Non aplikan an', name],
      ['Imèl', email],
      ['Non boutik la', application.shop_name],
      ['WhatsApp', application.whatsapp_number],
      ['Adrès', application.address],
      ['Kategori pwodwi', application.product_categories],
      ['Deskripsyon pwopozisyon an', application.product_description],
      ['Dat demann lan', new Date(application.created_at).toLocaleString('fr-FR', { timeZone: 'UTC' })],
    ]
    : [
      ['Non moun nan', name],
      ['Imèl', email],
      ['Kalite kont', 'Afilye'],
      ['Dat enskripsyon an', new Date(applicant.created_at).toLocaleString('fr-FR', { timeZone: 'UTC' })],
    ];
  const detailHtml = details
    .map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || 'Pa bay')}</p>`)
    .join('');
  const isSellerApplication = requestedRole === 'seller';
  const siteUrl = (process.env.URL || 'https://boutique-piyay.netlify.app').replace(/\/+$/, '');

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER.trim(),
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, ''),
      },
    });
    await transporter.sendMail({
      from: `"Boutique Piyay" <${process.env.GMAIL_USER.trim()}>`,
      to: process.env.ADMIN_EMAIL.trim(),
      subject: isSellerApplication
        ? `Nouvo demann machann: ${application.shop_name}`
        : `Nouvo enskripsyon afilye: ${name}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b"><h2>${isSellerApplication ? 'Nouvo demann machann ap tann apwobasyon' : 'Nouvo moun enskri kòm afilye'}</h2>${detailHtml}<p>Konekte sou <a href="${siteUrl}/admin-stats.html">panèl administratè a</a>${isSellerApplication ? ' pou revize aplikasyon an' : ''}.</p></div>`,
    });

    const { error: updateError } = await supabase.from('registration_email_notifications')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (updateError) {
      console.error('Email sent but notification status could not be saved:', updateError);
      return respond(500, { error: 'Email was sent but its status could not be saved.' });
    }
    return respond(200, { success: true });
  } catch (error) {
    console.error('Unable to send registration email through Gmail SMTP:', error);
    await supabase.from('registration_email_notifications')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    return respond(502, { error: 'Unable to send the registration email.' });
  }
};
