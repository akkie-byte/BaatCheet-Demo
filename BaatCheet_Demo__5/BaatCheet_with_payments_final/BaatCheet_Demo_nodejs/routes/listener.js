// ============================================================
//  BaatChete — routes/listener.js
//  Listener management — used by Anand's dashboard.
//
//  Endpoints:
//    POST /listener/toggle   → toggle available on/off
//    GET  /listener/queue    → get pending session requests
//    POST /listener/accept   → accept a session
//    POST /listener/end      → end session, mark available again
// ============================================================

const router = require('express').Router();
const admin  = require('firebase-admin');

// ── Toggle availability ──────────────────────────────────────
router.post('/toggle', async (req, res) => {
  const { listenerId, available } = req.body;
  const db = req.app.locals.db;

  if (!db) return res.json({ success: true, demo: true });

  try {
    await db.collection('listeners').doc(listenerId).update({ available });
    console.log(`[Listener] ${listenerId} available: ${available}`);
    res.json({ success: true, available });
  } catch (err) {
    console.error('[Listener] Toggle error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Get active queue for a listener ─────────────────────────
router.get('/queue/:listenerId', async (req, res) => {
  const { listenerId } = req.params;
  const db = req.app.locals.db;

  if (!db) {
    // Return demo data for Anand to build the UI against
    return res.json({ sessions: getDemoQueue() });
  }

  try {
    const snap = await db.collection('sessions')
      .where('listenerId', '==', listenerId)
      .where('status', 'in', ['matched', 'active'])
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ sessions });
  } catch (err) {
    console.error('[Listener] Queue error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Accept a session (listener taps Accept) ──────────────────
router.post('/accept', async (req, res) => {
  const { sessionId, listenerId } = req.body;
  const db = req.app.locals.db;

  if (!db) return res.json({ success: true, demo: true });

  try {
    await db.collection('sessions').doc(sessionId).update({
      status:     'accepted',
      listenerId,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[Listener] Accept error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── End session (listener taps End) ──────────────────────────
router.post('/end', async (req, res) => {
  const { sessionId, listenerId } = req.body;
  const db = req.app.locals.db;

  if (!db) return res.json({ success: true, demo: true });

  try {
    // Mark session as completed
    await db.collection('sessions').doc(sessionId).update({
      status:  'completed',
      endedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mark listener as available again
    if (listenerId) {
      await db.collection('listeners').doc(listenerId).update({
        available: true,
      });
    }

    console.log(`[Listener] Session ${sessionId} ended`);
    res.json({ success: true });
  } catch (err) {
    console.error('[Listener] End session error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Get today's session history for a listener ───────────────
router.get('/history/:listenerId', async (req, res) => {
  const { listenerId } = req.params;
  const db = req.app.locals.db;

  if (!db) return res.json({ sessions: getDemoHistory() });

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snap = await db.collection('sessions')
      .where('listenerId', '==', listenerId)
      .where('status',     '==', 'completed')
      .where('createdAt',  '>=', today)
      .orderBy('createdAt', 'desc')
      .get();

    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ sessions, count: sessions.length });
  } catch (err) {
    console.error('[Listener] History error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Demo data helpers (used when Firebase not ready) ─────────
function getDemoQueue() {
  return [
    {
      id: 'demo-1',
      issue: 'Work stress',
      brief: 'User experiencing burnout from long work hours. Exhausted but willing to talk. Open by asking about their day.',
      language: 'Hindi',
      status: 'matched',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo-2',
      issue: 'Loneliness',
      brief: 'User recently moved to a new city, feeling isolated. Gentle and patient approach needed.',
      language: 'English',
      status: 'matched',
      createdAt: new Date().toISOString(),
    },
  ];
}

function getDemoHistory() {
  return [
    { id: 's1', issue: 'Anxiety',    language: 'Hindi',   rating: 5, duration: '10 min' },
    { id: 's2', issue: 'Burnout',    language: 'English',  rating: 4, duration: '10 min' },
    { id: 's3', issue: 'Loneliness', language: 'Hindi',   rating: 5, duration: '10 min' },
  ];
}

module.exports = router;
