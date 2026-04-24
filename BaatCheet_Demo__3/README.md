# BaatChete Backend

WhatsApp-first mental wellness platform — Node.js + Express backend.

## Project Structure

```
baatchete-backend/
├── index.js              ← Main server (Pulkit)
├── aiEngine.js           ← AI empathy + triage engine (Rushikesh + Pulkit)
├── testAI.js             ← Test script (no Twilio needed)
├── .env.example          ← Copy to .env and fill in keys
├── serviceAccount.json   ← Firebase key (Suryadeep provides this)
└── routes/
    ├── webhook.js        ← Receives WhatsApp messages
    ├── match.js          ← Matchmaking engine
    ├── session.js        ← Audio room + notifications
    ├── listener.js       ← Listener dashboard API
    └── payment.js        ← Razorpay payment links
```

## Team Setup

| Who | What to do |
|-----|-----------|
| **Pulkit** | Clone repo, run `npm install`, set up `.env`, run `node index.js` |
| **Rushikesh** | Fill in `TWILIO_*`, `ANTHROPIC_API_KEY`, `DAILY_API_KEY`, `RAZORPAY_*` in `.env` |
| **Suryadeep** | Add `serviceAccount.json` to project root, set up Firebase collections |
| **Anand** | Use `/listener/*` endpoints for dashboard. Demo data works without Firebase. |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in keys
cp .env.example .env

# 3. Test the AI engine (no Twilio needed)
node testAI.js

# 4. Start the server
node index.js

# 5. Expose to internet for Twilio (install ngrok first)
ngrok http 3000
# Copy the https URL → paste into Twilio webhook field
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/webhook` | Twilio → receives WhatsApp messages |
| POST | `/match` | Trigger matchmaking |
| POST | `/session` | Create audio room + notify both parties |
| POST | `/listener/toggle` | Toggle listener availability |
| GET | `/listener/queue/:id` | Get pending session requests |
| POST | `/listener/accept` | Accept a session |
| POST | `/listener/end` | End session |
| GET | `/listener/history/:id` | Today's session history |
| POST | `/payment` | Send Razorpay payment link |

## Firebase Collections (Suryadeep sets these up)

### `listeners`
```json
{
  "name": "Priya",
  "phone": "+919876543210",
  "tier": "peer",
  "available": true,
  "verified": true,
  "language": ["Hindi", "English"],
  "totalSessions": 0,
  "rating": 5.0
}
```

### `sessions`
```json
{
  "userPhone": "whatsapp:+919999999999",
  "listenerPhone": "+919876543210",
  "listenerName": "Priya",
  "issue": "stress",
  "severity": 2,
  "tier": "peer",
  "brief": "3-line listener brief...",
  "status": "active",
  "roomUrl": "https://...",
  "paymentLink": "https://rzp.io/...",
  "paymentStatus": "pending",
  "createdAt": "timestamp"
}
```

### `triage_logs`
```json
{
  "phone": "whatsapp:+919999999999",
  "triage": {
    "severity": 2,
    "intensity": 5,
    "category": "stress",
    "crisisFlag": false,
    "listenerTier": "peer"
  },
  "updatedAt": "timestamp"
}
```

## Demo Mode

The backend works **without** Firebase and **without** real API keys:
- Firebase down → uses hardcoded demo listeners and returns mock data
- Daily.co missing → sends Google Meet link
- Razorpay missing → sends demo payment URL
- Crisis detection always works regardless of other services

## Deploy to Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

After deploy, update `.env`:
```
BASE_URL=https://your-app.up.railway.app
```

Then in Twilio console, set webhook to:
```
https://your-app.up.railway.app/webhook
```
