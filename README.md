# BaatChete Backend

WhatsApp-first mental wellness platform — Node.js + Express backend.

## Project Structure

```
baatchete-backend/
├── index.js              ← Main server 
├── aiEngine.js           ← AI empathy + triage engine 
├── testAI.js             ← Test script (no Twilio needed)
├── .env.example          ← Copy to .env and fill in keys
├── serviceAccount.json   ← Firebase key 
└── routes/
    ├── webhook.js        ← Receives WhatsApp messages
    ├── match.js          ← Matchmaking engine
    ├── session.js        ← Audio room + notifications
    ├── listener.js       ← Listener dashboard API
    └── payment.js        ← Razorpay payment links
```

## Team Setup

##  Team Members
* **Pulkit Lata** — Product Owner (Team Leader)
* **Akshita Singh** — Business SPOC (Lead Developer)
* **Rushikesh Vinodkumar Modani** — Developer
* **Dhruv Dawaser** — Developer
* **Nitish Gautam** — Intern
* **Kunvar Anand** — Intern (Major Developer)
* **Suryadeep Kumar** — QA (Developer)


*************************************************************************************************************************************************
## Initial SetUp

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

****************************************************************************************************************************************************
## Plan for DEMO


## 🏗️ System Architecture

Our project is divided into two major technical components:

### 1. The AI Gateway (User Facing)
The "front door" where users interact with an empathetic AI.
* **`interface.html`**: A high-fidelity UI that reveals the backend workflow.
* **`aiEngine.js`**: Orchestrates **Claude 3.5 Sonnet** to perform parallel Empathy and Triage scoring (0-5).
* **`webhook.js`**: The communication bridge between the user and the engine.

### 2. The Listener Dashboard (Provider Facing)
The workspace for Psychology Students and Licensed Therapists to manage routed cases.
* **`script.js`**: Handles the complex dashboard logic, including real-time chat, session management, and earnings tracking.
* **`style.css`**: Provides a modern, high-fashion aesthetic with fluid glassmorphism and interactive particle backgrounds.
* **Features**: Role-based registration (RCI for Therapists / Institute ID for Students), earnings analytics, and live request notification.

---

## 🛠️ Key Technical Files
* **`index.js`**: The main Express.js server that hosts both the AI gateway and the static dashboard assets.
* **`match.js`**: The logic layer that determines routing: Triage scores 0-3 go to **Student Listeners**, while scores 4-5 go to **Licensed Therapists**.

---

## 🚀 How to Demo

### Part 1: The AI Gateway
1. Open the Demo URL.
2. Type **"Hi"** to view the technical backend workflow reveal.
3. Click **"Continue"** and share a distress message (e.g., *"I'm feeling very anxious"*).
4. The AI will provide an empathetic response and calculate a triage score in the background.

### Part 2: The Listener Dashboard
1. Navigate to the Dashboard (Login/Register screen).
2. **Register** a new account as a **Student Listener** or **Therapist** (This uses local storage for persistence).
3. Go **"Online"** using the availability toggle to start receiving simulated user requests.
4. Accept a request to open the **Live Chat** interface and simulate a support session.

---

## 💻 Local Installation
1.  **Extract** the ZIP folder.
2.  **Install**: Run `npm install`.
3.  **Environment**: Create a `.env` file with `ANTHROPIC_API_KEY=your_key_here`.
4.  **Launch**: Run `node index.js` and visit `http://localhost:3000`.

---

### **Judges' Note**
This submission demonstrates a complete end-to-end pipeline. We have moved beyond simple chatbots to create a functional triage-and-routing tool that uses AI to improve, rather than replace, human mental health support.
