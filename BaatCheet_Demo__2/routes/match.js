// ============================================================
//  BaatChete — routes/match.js
//  Matchmaking engine — finds the right listener.
//
//  Called by webhook.js once AI says user is ready.
//  Reads Firebase for available listeners, assigns session,
//  then triggers session.js to create the audio room.
// ============================================================

const router       = require('express').Router();
const twilio       = require('twilio');
const admin        = require('firebase-admin');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

router.post('/', async (req, res) => {
  const { phone, issue, severity, tier, brief } = req.body;
  const db = req.app.locals.db;

  console.log(`[Match] Matching user ${phone} | tier: ${tier} | issue: ${issue}`);

  try {
    let listener = null;

    if (db) {
      listener = await findListener(db, tier);
    } else {
      // ── Demo mode: use a hardcoded listener ─────────────────
      // This keeps the hackathon demo working even if Firebase
      // isn't fully set up yet.
      listener = getDemoListener(tier);
      console.log('[Match] Running in demo mode — using hardcoded listener');
    }

    if (!listener) {
      // No listener available right now
      await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to:   phone,
        body:
          'Abhi saare listeners busy hain. 🙏\n\n' +
          'Hum aapko 5 minutes mein notify karenge jab koi available ho.\n' +
          'Tab tak — saans lein, aap sahi jagah aa gaye hain. 💙',
      });

      // Save to waiting queue in Firebase
      if (db) {
        await db.collection('waiting_queue').add({
          phone, issue, severity, tier, brief,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return res.json({ matched: false, reason: 'no_listeners_available' });
    }

    // ── Mark listener as busy ────────────────────────────────
    if (db && listener.ref) {
      await listener.ref.update({ available: false });
    }

    // ── Create session record in Firebase ────────────────────
    let sessionId = `demo-${Date.now()}`;
    if (db) {
      const sessionRef = await db.collection('sessions').add({
        userPhone:    phone,
        listenerPhone: listener.phone,
        listenerName:  listener.name,
        issue,
        severity,
        tier,
        brief,
        status:    'matched',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      sessionId = sessionRef.id;
    }

    console.log(`[Match] Matched! Session: ${sessionId} | Listener: ${listener.name}`);

    // ── Trigger audio room creation ──────────────────────────
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/session`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        userPhone:     phone,
        listenerPhone: listener.phone,
        listenerName:  listener.name,
        issue,
        brief,
      }),
    }).catch(err => console.error('[Match] Session trigger error:', err.message));

    res.json({ matched: true, sessionId, listenerName: listener.name });

  } catch (err) {
    console.error('[Match] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  FIND AVAILABLE LISTENER FROM FIREBASE
//  Filters by verified=true, available=true, and tier
// ─────────────────────────────────────────────────────────────
async function findListener(db, tier) {
  // Try to find a listener of the preferred tier first
  const tierOrder = getTierOrder(tier);

  for (const t of tierOrder) {
    const snap = await db.collection('listeners')
      .where('available', '==', true)
      .where('verified',  '==', true)
      .where('tier',      '==', t)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc  = snap.docs[0];
      const data = doc.data();
      return {
        ref:   doc.ref,
        id:    doc.id,
        name:  data.name,
        phone: data.phone,
        tier:  data.tier,
      };
    }
  }

  return null; // No listener found
}

// If the preferred tier has no one available, fall back to adjacent tiers
function getTierOrder(tier) {
  const orders = {
    peer:            ['peer', 'experienced_peer'],
    experienced_peer:['experienced_peer', 'peer', 'counselor'],
    counselor:       ['counselor', 'experienced_peer'],
    crisis:          ['counselor', 'experienced_peer'],
  };
  return orders[tier] || ['peer'];
}

// ─────────────────────────────────────────────────────────────
//  DEMO LISTENER (used when Firebase is not yet connected)
//  Replace with real data once Suryadeep sets up the DB.
// ─────────────────────────────────────────────────────────────
function getDemoListener(tier) {
  const listeners = {
    peer: {
      name:  'Priya',
      phone: process.env.DEMO_LISTENER_PHONE || '+919999999999',
      tier:  'peer',
    },
    experienced_peer: {
      name:  'Rahul',
      phone: process.env.DEMO_LISTENER_PHONE || '+919999999999',
      tier:  'experienced_peer',
    },
    counselor: {
      name:  'Dr. Sneha',
      phone: process.env.DEMO_LISTENER_PHONE || '+919999999999',
      tier:  'counselor',
    },
  };
  return listeners[tier] || listeners['peer'];
}

module.exports = router;
