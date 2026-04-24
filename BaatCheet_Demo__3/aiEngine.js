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

require('dotenv').config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model  = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ─────────────────────────────────────────────────────────────
//  SYSTEM PROMPT 1 — Empathetic reply (shown to user)
// ─────────────────────────────────────────────────────────────
const EMPATHY_PROMPT = `
You are BaatChete — a warm, empathetic first listener for people
in India experiencing emotional distress.

YOUR ROLE:
- You are NOT a therapist. You are a compassionate first presence
  like a trusted friend who truly listens without judgment.
- Your job: make the person feel heard and safe before connecting
  them to a human listener.

HOW YOU SPEAK:
- Short messages only — 2 to 4 sentences max. This is WhatsApp.
- Warm conversational Hindi-English mix when natural.
  Always match the user's language first. Never force it.
- Never use clinical terms: no "anxiety disorder", "depressive
  episode", "mental illness", "symptoms", "diagnosis".
- No unsolicited advice. No "you should..." statements.
  Reflect back what you hear. That is all.
- Ask ONE gentle open question per message. Never two.
- Always use "aap" — respectful, never "tum".

EVERY REPLY MUST:
  1. Acknowledge what they said with genuine warmth (1 sentence)
  2. Reflect the emotion you are hearing — describe it, don't label it
  3. Ask ONE open question to understand more deeply

NEVER DO THESE:
- Never say "I understand how you feel" — it sounds hollow
- Never minimise: "others have it worse" / "it'll be okay" / "stay positive"
- Never diagnose, suggest medication, or recommend therapy unprompted
- Never give a list of tips or self-help steps
- Never be preachy or lecture the user

CRISIS PROTOCOL — if ANY mention of self-harm or suicide:
  Reply warmly and immediately with:
  "Aap ne jo share kiya, wo sunke dil bhar aaya. 💙
   Please abhi iCall pe call karein: 9152987821
   Wahan trained log hain jo sunenge. Aap akele nahi hain."
  Then STOP normal conversation. Do not continue asking questions.

GOOD RESPONSE EXAMPLE:
  User: "Exams ke wajah se neend nahi aa rahi, 3 hafton se"
  Good: "Teen hafte bina sahi neend ke — yeh sirf stress nahi,
         yeh toh poora shareer thak gaya hai. Aur andar se bhi
         kuch chal raha hoga. Jab aap letते hain toh dimaag mein
         kya chalta rehta hai?"

BAD RESPONSE EXAMPLE:
  Bad: "I understand. Try meditation and make a study schedule.
        Sleep 8 hours and avoid your phone before bed."

CULTURAL CONTEXT — these matter deeply in India:
- Many users feel shame about seeking help. Never make them feel weak.
- Log kya sochenge, family pressure, career expectations — validate these.
- Silence and venting are both valid. Do not rush to fix things.
- Parents/family pressure, relationship shame, career failure fear
  are common triggers — treat them with full seriousness.

YOUR ONLY JOB: Make this person feel less alone.
The human listener will do everything else.
`;

// ─────────────────────────────────────────────────────────────
//  SYSTEM PROMPT 2 — Silent triage (never shown to user)
// ─────────────────────────────────────────────────────────────
const TRIAGE_PROMPT = `
You are a clinical triage assistant for a mental wellness platform.
Read the entire conversation and return a JSON object ONLY.
No explanation, no preamble, no markdown fences. Raw valid JSON only.

Return exactly this schema:
{
  "severity":        <integer 0 to 5>,
  "intensity":       <integer 1 to 10>,
  "duration":        <"acute" | "persistent" | "chronic" | "unknown">,
  "category":        <"stress" | "anxiety" | "loneliness" | "burnout" | "relational" | "grief" | "unclear">,
  "crisisFlag":      <true | false>,
  "readyForSession": <true | false>,
  "listenerTier":    <"peer" | "experienced_peer" | "counselor" | "crisis">,
  "brief":           <string: 3-line private note for the human listener>
}

SEVERITY SCALE:
  0 = no distress detected
  1 = mild, managing okay
  2 = noticeable, affecting mood
  3 = significant, disrupting daily tasks
  4 = serious, major disruption to daily life
  5 = crisis — immediate intervention needed

DURATION:
  acute     = hours to a few days
  persistent = 1–4 weeks
  chronic   = more than a month
  unknown   = not enough info yet

CRISIS FLAG:
  Set crisisFlag to true if ANY hint of:
  self-harm, suicidal thoughts, hurting self or others,
  "giving up on everything", "don't want to live"

LISTENER TIER ROUTING:
  crisis           → crisisFlag is true (ALWAYS override other tiers)
  counselor        → severity 4 or 5
  experienced_peer → severity 2 or 3
  peer             → severity 0 or 1

READY FOR SESSION:
  Set readyForSession to true when you have enough context to make a
  meaningful match — usually after 2 to 3 substantive user messages.
  Do NOT set true on the very first message.

BRIEF (3 lines, private — user never sees this):
  Line 1: What the user is going through (factual, concise)
  Line 2: Their emotional state right now (tone, energy level)
  Line 3: One gentle opening suggestion for the listener

EXAMPLE BRIEF:
  "User experiencing severe work burnout and exam pressure for 3+ weeks.
   Exhausted, running on empty, slightly guarded but willing to talk.
   Open by acknowledging the physical toll — ask about sleep before asking about feelings."

OUTPUT: Return ONLY the JSON object. Zero other text.
`;

// ─────────────────────────────────────────────────────────────
//  CONVERSATION STORE
//  In-memory for hackathon. In production: Firebase per session.
// ─────────────────────────────────────────────────────────────
const conversations = {};  // { phone: [{role, content}, ...] }

function getHistory(phone) {
  if (!conversations[phone]) conversations[phone] = [];
  return conversations[phone];
}

function addToHistory(phone, role, content) {
  const history = getHistory(phone);
  history.push({ role, content });
  // Keep last 20 messages to stay within token limits
  if (history.length > 20) history.splice(0, history.length - 20);
}

// ─────────────────────────────────────────────────────────────
//  CALL 1 — Empathetic reply
// ─────────────────────────────────────────────────────────────
async function getEmpathyReply(phone) {
  const history = getHistory(phone);
  const lastMessage = history[history.length - 1].content;

  const chat = model.startChat({
    history: [], // You can map your 'history' here if needed later
    generationConfig: { maxOutputTokens: 300 },
  });

  const result = await chat.sendMessage(`System Prompt: ${EMPATHY_PROMPT}\n\nUser Message: ${lastMessage}`);
  return result.response.text().trim();
}

// ─────────────────────────────────────────────────────────────
//  CALL 2 — Silent triage scoring
// ─────────────────────────────────────────────────────────────
async function getTriageScore(phone) {
  const history = getHistory(phone);
  if (history.filter(m => m.role === 'user').length < 1) return null;

  const lastMessage = history[history.length - 1].content;
  
  const result = await model.generateContent(`${TRIAGE_PROMPT}\n\nAnalyze this message: ${lastMessage}`);
  const responseText = result.response.text();

  try {
    // 1. Remove markdown code fences
    let clean = responseText.replace(/```json|```/g, '').trim();
    
    // 2. Remove "Bad control characters" (new lines/tabs inside the JSON string)
    // This is what will fix the "position 235" error
    clean = clean.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

    return JSON.parse(clean);
  } catch (err) {
    console.error('[aiEngine] Triage parse error:', err.message);
    // Safe fallback — never crash the conversation
    return {
      severity: 1, intensity: 3, duration: 'unknown',
      category: 'unclear', crisisFlag: false,
      readyForSession: false, listenerTier: 'peer',
      brief: 'User just started. Approach with warmth and patience.',
    };
  }
}

// ─────────────────────────────────────────────────────────────
//  ROUTING — pure code, zero AI involvement
//  AI suggests via triage scores, code makes final call.
// ─────────────────────────────────────────────────────────────
function routeUser(triage) {
  if (!triage) return { action: 'continue', message: null };

  // CRISIS — override everything
  if (triage.crisisFlag) {
    return {
      action: 'crisis',
      message:
        'Aap ne jo share kiya, wo sunke dil bhar aaya. 💙\n\n' +
        'Please abhi in numbers pe call karein — yeh trained log hain jo 24/7 available hain:\n\n' +
        '📞 *iCall: 9152987821*\n' +
        '📞 *Vandrevala Foundation: 1860-2662-345*\n' +
        '📞 *Snehi: 044-24640050*\n\n' +
        'Aap akele nahi hain. Main yahan hoon. 🙏',
    };
  }

  // Not enough info yet — keep the conversation going
  if (!triage.readyForSession) {
    return { action: 'continue', message: null };
  }

  // COUNSELOR tier
  if (triage.listenerTier === 'counselor') {
    return {
      action: 'match_counselor',
      message:
        'Aapne jo share kiya, uske liye shukriya — yeh share karna asaan nahi hota. 🙏\n\n' +
        'Main aapko ek trained counselor se connect kar raha/rahi hoon. ' +
        'Koi jo aapki baat dhyan se sunenge aur sahi help kar sakenge.\n\n' +
        'Ek minute mein audio session ka link aayega. 💙',
    };
  }

  // EXPERIENCED PEER tier
  if (triage.listenerTier === 'experienced_peer') {
    return {
      action: 'match_experienced',
      message:
        'Itna sab akele carry karna — bahut bhaari lagta hoga. 🌿\n\n' +
        'Ek trained listener aapka intezaar kar raha/rahi hai. ' +
        'Woh sunenge, judge nahi karenge.\n\n' +
        'Audio session link 60 seconds mein aayega. 💚',
    };
  }

  // DEFAULT peer listener
  return {
    action: 'match_peer',
    message:
      'Shukriya — yeh pehla kadam bahut zaroori tha. 💚\n\n' +
      'Ek warm listener se aapko abhi connect kar raha/rahi hoon. ' +
      'Audio session ka link 1 minute mein aayega. 🙏',
  };
}

// ─────────────────────────────────────────────────────────────
//  SAVE TRIAGE TO FIREBASE (non-blocking)
// ─────────────────────────────────────────────────────────────
async function saveTriageToFirebase(db, phone, triage) {
  if (!db) return;
  try {
    const safePhone = phone.replace(/\W/g, '');
    await db.collection('triage_logs').doc(safePhone).set({
      triage,
      phone,
      updatedAt: require('firebase-admin').firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('[aiEngine] Firebase save error:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────
//  MAIN EXPORT
//
//  Usage in webhook.js:
//    const { handleMessage } = require('../aiEngine');
//    const result = await handleMessage(db, phone, message);
//
//  Returns:
//    result.reply   → send this to user via Twilio
//    result.action  → 'continue' | 'match_peer' |
//                     'match_experienced' | 'match_counselor' | 'crisis'
//    result.triage  → full triage object
//    result.brief   → 3-line listener brief
// ─────────────────────────────────────────────────────────────
async function handleMessage(db, phone, userMessage) {
  // 1. Add user message to history
  addToHistory(phone, 'user', userMessage);

  // 2. Run both Claude calls in parallel (saves ~1 second)
  const [empathyReply, triage] = await Promise.all([
    getEmpathyReply(phone),
    getTriageScore(phone),
  ]);

  // 3. Add AI reply to history so next call has full context
  addToHistory(phone, 'assistant', empathyReply);

  // 4. Decide routing action
  const routing = routeUser(triage);

  // 5. Final reply = routing message if matching, else empathy reply
  const finalReply = routing.message || empathyReply;

  // 6. Save triage to Firebase (non-blocking, won't crash if Firebase down)
  if (triage) saveTriageToFirebase(db, phone, triage).catch(() => {});

  return {
    reply:  finalReply,
    action: routing.action,
    triage: triage,
    brief:  triage?.brief || '',
  };
}

function clearConversation(phone) {
  delete conversations[phone];
}

module.exports = { handleMessage, clearConversation };
