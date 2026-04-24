// ============================================================
//  BaatChete — routes/session.js
//  Creates Daily.co audio room and notifies both sides.
//
//  Called by match.js once a listener is found.
//  1. Creates a private audio room via Daily.co API
//  2. Saves room URL to Firebase session record
//  3. Sends room link to USER via WhatsApp
//  4. Sends room link + brief to LISTENER via WhatsApp
//  5. Updates listener dashboard via Firebase
// ============================================================

const router       = require('express').Router();
const twilio       = require('twilio');
const admin        = require('firebase-admin');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

router.post('/', async (req, res) => {
  const { sessionId, userPhone, listenerPhone, listenerName, issue, brief } = req.body;
  const db = req.app.locals.db;

  console.log(`[Session] Creating session ${sessionId} | Listener: ${listenerName}`);

  try {
    // ── Create Daily.co audio room ───────────────────────────
    const roomUrl = await createAudioRoom(sessionId);

    console.log(`[Session] Room created: ${roomUrl}`);

    // ── Update Firebase session with room URL ────────────────
    if (db) {
      await db.collection('sessions').doc(sessionId).update({
        roomUrl,
        status:    'active',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        brief,
      });
    }

    // ── Send link to USER ────────────────────────────────────
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to:   userPhone,
      body:
        `✅ ${listenerName} aapke liye ready hain!\n\n` +
        `🎙️ Apna 10-minute session yahan join karein:\n${roomUrl}\n\n` +
        `Aap safe hain. Ek gehri saans lein. 💚\n\n` +
        `_Session automatically 15 minutes mein end hoga._`,
    });

    // ── Send link + brief to LISTENER ───────────────────────
    const listenerTo = listenerPhone.startsWith('whatsapp:')
      ? listenerPhone
      : `whatsapp:${listenerPhone}`;

    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to:   listenerTo,
      body:
        `🔔 *Naya session request!*\n\n` +
        `📋 *Brief:*\n${brief || 'User ne abhi connect kiya hai.'}\n\n` +
        `🎙️ Session join karein:\n${roomUrl}\n\n` +
        `_User aapka intezaar kar raha/rahi hai. 🙏_`,
    });

    console.log(`[Session] Both parties notified for session ${sessionId}`);

    // ── Schedule payment link after 11 minutes ───────────────
    schedulePayment(sessionId, userPhone, listenerName);

    res.json({ success: true, roomUrl, sessionId });

  } catch (err) {
    console.error('[Session] Error:', err.message);

    // Notify user of fallback even if Daily.co fails
    try {
      await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to:   userPhone,
        body:
          `✅ ${listenerName} aapke liye ready hain!\n\n` +
          `Woh aapse directly contact karenge. Thoda intezaar karein. 🙏`,
      });
    } catch (_) {}

    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  CREATE DAILY.CO AUDIO ROOM
// ─────────────────────────────────────────────────────────────
async function createAudioRoom(sessionId) {
  // If no Daily API key, return a Google Meet fallback for demo
  if (!process.env.DAILY_API_KEY || process.env.DAILY_API_KEY === 'your_daily_api_key_here') {
    console.warn('[Session] No Daily.co API key — using demo room URL');
    return `https://meet.google.com/demo-${sessionId.slice(0, 8)}`;
  }

  const response = await fetch('https://api.daily.co/v1/rooms', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: `bc-${sessionId}`,
      properties: {
        exp:               Math.floor(Date.now() / 1000) + 900, // 15 min expiry
        max_participants:  2,
        enable_chat:       false,
        enable_screenshare: false,
        start_audio_off:   false,
        start_video_off:   true,  // Audio-only by default
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Daily.co error: ${err}`);
  }

  const room = await response.json();
  return room.url;
}

// ─────────────────────────────────────────────────────────────
//  SCHEDULE PAYMENT LINK (fires 11 min after session starts)
// ─────────────────────────────────────────────────────────────
function schedulePayment(sessionId, userPhone, listenerName) {
  setTimeout(async () => {
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/payment`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userPhone, listenerName }),
      });
    } catch (err) {
      console.error('[Session] Payment schedule error:', err.message);
    }
  }, 11 * 60 * 1000); // 11 minutes
}

module.exports = router;
