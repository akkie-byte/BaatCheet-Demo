// ============================================================
//  BaatChete — routes/payment.js
//  Sends Razorpay payment link via WhatsApp after session.
//
//  Called automatically by session.js 11 minutes after
//  the session starts.
// ============================================================

const router       = require('express').Router();
const twilio       = require('twilio');
const admin        = require('firebase-admin');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

router.post('/', async (req, res) => {
  const { sessionId, userPhone, listenerName } = req.body;
  const db = req.app.locals.db;

  try {
    // ── Create Razorpay payment link ─────────────────────────
    const paymentLink = await createPaymentLink(sessionId);

    // ── Send payment link to user via WhatsApp ───────────────
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to:   userPhone,
      body:
        `🙏 Umeed hai baat achhi rahi!\n\n` +
        `Session complete karne ke liye ₹99 ka payment karein:\n` +
        `💳 ${paymentLink}\n\n` +
        `Aur ek minute mein feedback bhi share karein — isse hum better bana sakte hain. 💚`,
    });

    // ── Send feedback request after 2 more minutes ──────────
    scheduleRatingRequest(userPhone, listenerName);

    // ── Update session status ────────────────────────────────
    if (db) {
      await db.collection('sessions').doc(sessionId).update({
        paymentLink,
        paymentStatus: 'pending',
        paymentSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log(`[Payment] Link sent for session ${sessionId}`);
    res.json({ success: true, paymentLink });

  } catch (err) {
    console.error('[Payment] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  CREATE RAZORPAY PAYMENT LINK
// ─────────────────────────────────────────────────────────────
async function createPaymentLink(sessionId) {
  // Demo mode — return a fake link if no Razorpay key
  if (!process.env.RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID === 'rzp_test_xxxxxxxxxxxxxxxx') {
    console.warn('[Payment] No Razorpay key — using demo link');
    return `https://rzp.io/l/demo-${sessionId.slice(0, 8)}`;
  }

  const credentials = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/payment_links', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({
      amount:      9900,           // ₹99 in paise
      currency:    'INR',
      description: 'BaatChete — 10 min wellness session',
      reference_id: sessionId,
      options: {
        checkout: {
          name:    'BaatChete',
          prefill: { contact: '' },
        },
      },
      expire_by: Math.floor(Date.now() / 1000) + 86400, // 24 hr expiry
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Razorpay error: ${err}`);
  }

  const link = await response.json();
  return link.short_url;
}

// ─────────────────────────────────────────────────────────────
//  RATING REQUEST (fires 2 min after payment link)
// ─────────────────────────────────────────────────────────────
function scheduleRatingRequest(userPhone, listenerName) {
  setTimeout(async () => {
    try {
      await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to:   userPhone,
        body:
          `${listenerName} ke saath session kaisa raha? 🌟\n\n` +
          `Ek number bhejein (1 se 5):\n` +
          `1 = Acha nahi laga\n` +
          `3 = Theek tha\n` +
          `5 = Bahut acha laga ⭐\n\n` +
          `Aapka feedback humein better banata hai. 🙏`,
      });
    } catch (err) {
      console.error('[Payment] Rating request error:', err.message);
    }
  }, 2 * 60 * 1000); // 2 minutes after payment
}

module.exports = router;
