// ============================================================
//  BaatChete — aiEngine.js
//  The heart of the AI system.
//
//  TWO Claude calls per user message:
//    Call 1 → warm empathetic reply (user sees this)
//    Call 2 → silent triage JSON   (user never sees this)
//
//  Both calls run in parallel via Promise.all()
//  so user wait time = ~1 single API call, not 2.
// ============================================================


const axios = require('axios');

async function handleMessage(db, phone, userMessage) {
  try {
    const response = await axios.post('http://127.0.0.1:5000/api/ai/consult', {
      message: userMessage,
      phone: phone
    });

    // ... existing axios call stays the same ...

    const { reply, tier, intensity, crisis, provider } = response.data;

    // ADD-ON: Determine if this is for a student or professional
    let targetRole = (tier === 'red' || crisis) ? 'therapist' : 'listener';

    if (db) {
      // UPDATE: We add 'targetRole' to your existing triage document
      await db.collection('triage_logs').doc(phone).set({
        phone,
        triage: {
          listenerTier: tier,    
          intensity: intensity,  
          crisisFlag: crisis,    
          targetRole: targetRole, // <--- New filter field for dashboard
          provider: provider     
        },
        updatedAt: new Date()
      });
    }

    // UPDATE: We now return targetRole so the main server can use it for routing
    return { 
        reply, 
        tier, 
        targetRole, 
        action: crisis ? 'escalate' : 'assign' 
    };

  } catch (err) {
    console.error("Python Handshake Failed:", err.message);
    return { reply: "Technical issue, please wait...", action: 'continue' };
  }
}

module.exports = { handleMessage };

