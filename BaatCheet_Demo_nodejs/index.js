
// ============================================================
//  BaatChete — index.js  (main server)
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const twilio = require('twilio');
const admin = require('firebase-admin');
const { createOrder } = require('./payments/razorpay');

const app = express();
app.use(cors()); //

// ── 1. Twilio Setup ──────────────────────────────────────────
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ── 2. Parse incoming requests ───────────────────────────────
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ── 3. Firebase init ─────────────────────────────────────────
let db;
try {
  const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  console.log('✅ Firebase connected');
} catch (err) {
  console.warn('⚠️  Firebase not connected:', err.message);
}
app.locals.db = db;

// ── 4. Health check & Existing Routes ────────────────────────
app.get('/', (req, res) => res.json({ status: 'running' }));
app.use('/match',   require('./routes/match'));
app.use('/session', require('./routes/session'));
app.use('/listener',require('./routes/listener'));
app.use('/payment', require('./routes/payment'));
app.post('/create-order', createOrder);

// ============================================================
// 🔥 THE JOURNEY LOGIC
// ============================================================

// 📍 PART A: The Webhook (Receives message, asks Python, alerts Dashboard)
// 📍 PART A: The Webhook (Receives message, alerts Dashboard, asks Python)
// 📍 PART A: The Webhook (Receives message, alerts Dashboard, asks Python)
app.post('/webhook', async (req, res) => {
  const userPhone = req.body.From.replace('whatsapp:', '');
  const userMsg = req.body.Body;

  try {
    // 1. MAGIC RESET SWITCH (Clears ghost sessions)
    if (userMsg.trim().toUpperCase() === 'RESET') {
      await db.collection('sessions').doc(userPhone).delete();
      await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
        to: `whatsapp:${userPhone}`,
        body: "✅ SYSTEM RESET: All ghost sessions cleared. The AI is now awake."
      });
      return res.status(200).send('OK');
    }

    // 2. CHECK IF AI IS MUTED (Therapist is talking)
    if (db) {
      const sessionDoc = await db.collection('sessions').doc(userPhone).get();
      if (sessionDoc.exists && sessionDoc.data().status === 'active') {
        await db.collection('chats').add({
          from: userPhone, text: userMsg, type: 'incoming', timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`🤫 Therapist is active. Message sent to Dashboard.`);
        return res.status(200).send('OK'); // STOP HERE so AI doesn't talk
      }

      // 3. FIREBASE TRIAGE ALERT (Do this FIRST so it never fails)
      await db.collection('triage_logs').doc(userPhone).set({
        userPhone: userPhone,
        message: userMsg,
        triage: { targetRole: 'therapist', listenerTier: 'red' },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Firebase Updated: Request sent to Dashboard.`);
    }

    // 4. ASK PYTHON (AI)
    let aiReply = "I am connecting you with a therapist now. Please hold on.";
    try {
      const aiRes = await axios.post('http://127.0.0.1:5000/api/ai/consult', {
        message: userMsg, phone: userPhone
      });
      if (aiRes.data && aiRes.data.reply) { aiReply = aiRes.data.reply; }
    } catch (e) {
        console.log("⚠️ Python AI delayed. Using fallback.");
    }

    // 5. SEND WHATSAPP
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
      to: `whatsapp:${userPhone}`,
      body: aiReply
    });

    res.status(200).send('OK');
  } catch (err) {
    console.error("❌ Webhook Error:", err.message);
    res.status(500).send('Error');
  }
});

// 📍 PART B: The Accept Button (Mutes the AI)
app.post('/api/bridge/connect', async (req, res) => {
  const { userPhone, therapistEmail } = req.body;
  try {
    // 1. Update Cloud Sessions
    await db.collection('sessions').doc(userPhone).set({
      userPhone, therapistEmail, status: 'active', startTime: new Date()
    });

    // 2. Tell Python to mute Dr. Prachi
    await axios.post('http://127.0.0.1:5000/api/bridge/connect', { userPhone });
    
    res.json({ success: true });
  } catch (err) {
    console.error("Bridge Connection Failed:", err.message);
    res.status(500).json({ error: "Failed to connect" });
  }
});

// 📍 PART C: Send Message (Dashboard -> WhatsApp)
app.post('/api/session/send-message', async (req, res) => {
  const { to, message } = req.body;
  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
      to: `whatsapp:${to}`,
      body: message
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Twilio failed to send:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 📍 PART C: The Payment Link Trigger (Fires when session ends)
app.post('/api/send-receipt', async (req, res) => {
  const { userPhone, amount, therapistName } = req.body;
  
  try {
    // Replace this URL with your actual Razorpay Payment Page link!
    const checkoutLink = "https://rzp.io/l/your-demo-link"; 

    const receiptMessage = `✅ Session Closed.\n\nThank you for talking with ${therapistName}.\n\nTotal Due: Rs. ${amount}\nPlease complete your secure payment here:\n👉 ${checkoutLink}\n\n*How was your session?*\nPlease reply with a number from 1 to 5 (5 being Excellent) to rate your experience.`;

    // Send the WhatsApp message via Twilio
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
      to: `whatsapp:${userPhone}`,
      body: receiptMessage
    });

    console.log(`💸 SUCCESS: Payment link texted to ${userPhone}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Payment Link Error:", err.message);
    res.status(500).json({ error: "Failed to send payment link" });
  }
});

// ── 5. Error Handlers & Server Start ─────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => res.status(500).json({ error: 'Server error' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 BaatChete backend running on port ${PORT}`);
  console.log(`   Webhook URL:  http://localhost:${PORT}/webhook\n`);
});