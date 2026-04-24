// ============================================================
//  BaatChete — testAI.js
//  Test the full AI engine without needing Twilio or Firebase.
//
//  Run with:  node testAI.js
//  Requires:  ANTHROPIC_API_KEY in .env
// ============================================================

require('dotenv').config();

// ── Mock firebase-admin so test works without DB ─────────────
const Module = require('module');
const origResolve = Module._resolveFilename.bind(Module);
Module._resolveFilename = (req, ...args) => {
  if (req === 'firebase-admin') return req;
  return origResolve(req, ...args);
};
require.cache['firebase-admin'] = {
  id: 'firebase-admin', filename: 'firebase-admin',
  loaded: true, exports: {
    initializeApp:  () => {},
    credential:     { cert: () => {} },
    firestore:      () => ({
      collection: () => ({
        doc:    () => ({ set: async () => {}, update: async () => {} }),
        add:    async () => ({ id: 'mock-id' }),
        where:  () => ({ where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) }),
      }),
      FieldValue: { serverTimestamp: () => new Date() }
    }),
  }
};

const { handleMessage, clearConversation } = require('./aiEngine');

// ── Test conversation ─────────────────────────────────────────
const PHONE = 'test:+919999999999';

const conversation = [
  'Hi, mujhe kisi se baat karni hai',
  'Main bahut stressed hoon apne kaam se. Mera manager hamesha criticize karta hai aur mujhe office jaana pasand nahi',
  'Yeh 3 mahine se chal raha hai. Raat ko neend nahi aati aur main bohot exhausted feel karta hoon',
  'Kabhi kabhi lagta hai sab chhod doon',
];

async function run() {
  console.log('\n' + '═'.repeat(62));
  console.log('  BaatChete AI Engine — Full Conversation Test');
  console.log('═'.repeat(62));

  if (!process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_API_KEY.includes('xxxx')) {
    console.error('\n❌ ANTHROPIC_API_KEY not set in .env\n');
    process.exit(1);
  }

  for (let i = 0; i < conversation.length; i++) {
    const msg = conversation[i];
    console.log(`\n${'─'.repeat(62)}`);
    console.log(`👤 User [msg ${i+1}]: ${msg}`);
    console.log('─'.repeat(62));

    const result = await handleMessage(null, PHONE, msg);

    console.log(`🤖 BaatChete:\n   ${result.reply.replace(/\n/g, '\n   ')}`);
    console.log(`\n⚡ Action: ${result.action}`);

    if (result.triage) {
      const t = result.triage;
      console.log(`📊 Triage:`);
      console.log(`   Severity:  ${t.severity}/5`);
      console.log(`   Intensity: ${t.intensity}/10`);
      console.log(`   Category:  ${t.category}`);
      console.log(`   Duration:  ${t.duration}`);
      console.log(`   Crisis:    ${t.crisisFlag}`);
      console.log(`   Tier:      ${t.listenerTier}`);
      console.log(`   Ready:     ${t.readyForSession}`);
    }

    if (result.brief) {
      console.log(`\n📋 Listener brief:\n   ${result.brief.replace(/\n/g, '\n   ')}`);
    }
  }

  clearConversation(PHONE);
  console.log('\n' + '═'.repeat(62));
  console.log('  ✅ Test complete. All messages processed.');
  console.log('═'.repeat(62) + '\n');
}

run().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
