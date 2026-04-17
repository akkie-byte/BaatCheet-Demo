// ============================================================
//  BaatChete — routes/webhook.js
//  Entry point for every WhatsApp message from users.
//
//  Twilio POSTs here when a user messages BaatChete.
//  Set webhook URL in Twilio console to:
//    https://your-railway-url.up.railway.app/webhook
// ============================================================

const router = require('express').Router();
const twilio = require('twilio');
const { handleMessage } = require('../aiEngine');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

router.post('/', async (req, res) => {
  const userMessage = req.body.Body?.trim();
  const userPhone = req.body.From;   // "whatsapp:+919876543210"

  if (!userMessage || !userPhone) return res.sendStatus(400);

  console.log(`[Webhook] ${userPhone}: "${userMessage}"`);

  try {
    const db = req.app.locals.db;

    // ── Core AI engine — empathy + triage in parallel ────────
    const result = await handleMessage(db, userPhone, userMessage);

    // ── Send reply to user via Twilio ────────────────────────
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: userPhone,
      body: result.reply,
    });

    // ── Trigger matchmaking if AI says user is ready ─────────
    if (result.action !== 'continue' && result.action !== 'crisis') {
      triggerMatchmaking(req, userPhone, result);
    }

    res.json({ reply: result.reply }); 

  } catch (err) {
    console.error('[Webhook] Error:', err.message);

    // Always send fallback so user is never left hanging
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: userPhone,
      body: 'Ek second ruk jaiye... main yahan hoon. 🙏',
    }).catch(() => { });

    res.sendStatus(500);
  }
});

// Non-blocking internal call to match route
function triggerMatchmaking(req, userPhone, result) {
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

  fetch(`${baseUrl}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: userPhone,
      issue: result.triage?.category || 'unclear',
      severity: result.triage?.severity || 1,
      tier: result.triage?.listenerTier || 'peer',
      brief: result.brief || '',
    }),
  }).catch(err => console.error('[Webhook] Matchmaking trigger error:', err.message));
}

module.exports = router;
