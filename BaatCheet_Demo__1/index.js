// ============================================================
//  BaatChete — index.js  (main server)
//  Run with: node index.js
//  Dev mode: nodemon index.js
// ============================================================

require('dotenv').config();
const express = require('express');
const app     = express();

// ── Parse incoming requests ──────────────────────────────────
app.use(express.urlencoded({ extended: false }));  // Twilio sends URL-encoded
app.use(express.json());

// ── Firebase init ────────────────────────────────────────────
const admin = require('firebase-admin');

let db;
try {
  const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
  console.log('✅ Firebase connected');
} catch (err) {
  console.warn('⚠️  Firebase not connected (running without DB):', err.message);
  // App still runs — useful during development before Suryadeep sets up Firebase
}

// Make db available to all routes
app.locals.db = db;

// ── Health check ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'BaatChete Backend',
    status:  'running',
    time:    new Date().toISOString(),
  });
});

// ── Routes ───────────────────────────────────────────────────
app.use('/webhook', require('./routes/webhook'));   // Twilio → AI engine
app.use('/match',   require('./routes/match'));     // Matchmaking
app.use('/session', require('./routes/session'));   // Audio room + notifications
app.use('/listener',require('./routes/listener')); // Listener status updates
app.use('/payment', require('./routes/payment'));   // Razorpay payment link

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 BaatChete backend running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/`);
  console.log(`   Webhook URL:  http://localhost:${PORT}/webhook\n`);
});
