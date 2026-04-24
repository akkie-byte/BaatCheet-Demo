const router = require('express').Router();
const twilio = require('twilio');
const axios = require('axios');
const admin = require('firebase-admin');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

router.post('/', async (req, res) => {
  const userMessage = req.body.Body?.trim();
  const userPhone   = req.body.From;   // "whatsapp:+919876543210"

  if (!userMessage || !userPhone) return res.sendStatus(400);

  try {
    const db = req.app.locals.db;

    // ── BRIDGE: CALL PYTHON FOR DR. PRACHI LOGIC ──
    const pyResponse = await axios.post('http://localhost:5000/api/ai/consult', {
        message: userMessage,
        phone: userPhone.replace('whatsapp:', '') 
    });

    const { reply, triage, provider } = pyResponse.data;

    // ── UPDATE FIREBASE FOR DASHBOARD LIGHTS ──
    if (db) {
      const safePhone = userPhone.replace(/\W/g, '');
      await db.collection('triage_logs').doc(safePhone).set({
        phone: userPhone,
        triage: { 
            listenerTier: triage,
            ai_provider: provider 
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    // ── SEND REPLY TO USER VIA TWILIO ──
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to:   userPhone,
      body: reply,
    });

    res.sendStatus(200);

  } catch (err) {
    console.error('[Bridge Error]:', err.message);

    // Fallback message
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to:   userPhone,
      body: 'Ek second ruk jaiye... main yahan hoon. 🙏',
    }).catch(() => {});

    res.sendStatus(500);
  }
});

module.exports = router;