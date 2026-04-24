import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase ONLY if it hasn't been started yet
if not firebase_admin._apps:
    # Ensure serviceAccount.json is in your baatcheet_python folder!
    cred = credentials.Certificate("serviceAccount.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()
import os
import json
import re
from ai.therapist_prompt import THERAPIST_SYSTEM_PROMPT, CRISIS_RESPONSE, CRISIS_KEYWORDS

def _load_keys(env_var):
    val = os.getenv(env_var, "")
    return [k.strip() for k in val.split(",") if k.strip()]

class GroqProvider:
    name = "Groq"
    model = "llama-3.3-70b-versatile"
    def __init__(self):
        self.keys = _load_keys("GROQ_API_KEYS")
        self.failed = set()
    def call(self, messages):
        from groq import Groq
        available = [k for k in self.keys if k not in self.failed]
        for key in available:
            try:
                res = Groq(api_key=key).chat.completions.create(model=self.model, messages=messages, max_tokens=600, temperature=0.75)
                return res.choices[0].message.content
            except Exception as e:
                self.failed.add(key)
                continue
        raise Exception("Groq exhausted")

class GeminiProvider:
    name = "Gemini"
    model = "gemini-2.0-flash"
    def __init__(self):
        self.keys = _load_keys("GEMINI_API_KEYS")
        self.failed = set()
    def call(self, messages):
        from google import genai
        from google.genai import types
        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        chat_messages = [m for m in messages if m["role"] != "system"]
        available = [k for k in self.keys if k not in self.failed]
        for key in available:
            try:
                client = genai.Client(api_key=key)
                contents = [types.Content(role="user" if m["role"]=="user" else "model", parts=[types.Part(text=m["content"])]) for m in chat_messages]
                res = client.models.generate_content(model=self.model, contents=contents, config=types.GenerateContentConfig(system_instruction=system, max_output_tokens=600, temperature=0.75))
                return res.text
            except Exception:
                self.failed.add(key)
                continue
        raise Exception("Gemini exhausted")

class ClaudeProvider:
    name = "Claude"
    model = "claude-haiku-4-5-20251001"
    def __init__(self):
        self.keys = _load_keys("ANTHROPIC_API_KEYS")
        self.failed = set()
    def call(self, messages):
        import anthropic
        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        chat_msgs = [m for m in messages if m["role"] != "system"]
        available = [k for k in self.keys if k not in self.failed]
        for key in available:
            try:
                res = anthropic.Anthropic(api_key=key).messages.create(model=self.model, max_tokens=600, system=system, messages=chat_msgs)
                return res.content[0].text
            except Exception:
                self.failed.add(key)
                continue
        raise Exception("Claude exhausted")

class FallbackEngine:
    def __init__(self):
        self.providers = [p for p in [GroqProvider(), GeminiProvider(), ClaudeProvider()] if p.keys]
        self.current_provider = "None"
    def call(self, messages):
        for provider in self.providers:
            try:
                result = provider.call(messages)
                self.current_provider = provider.name
                return result, provider.name
            except Exception:
                continue
        raise Exception("All providers exhausted")

class BaatcheetAI:
    def __init__(self):
        self.engine = FallbackEngine()
        self.last_triage = None

    def is_crisis(self, message: str) -> bool:
        return any(kw in message.lower() for kw in CRISIS_KEYWORDS)

    def extract_tier_data(self, text: str):
        match = re.search(r'\{[^{}]*"ready"\s*:\s*true[^{}]*\}', text)
        if match:
            try: return json.loads(match.group())
            except: return None
        return None

    def clean_response(self, text: str) -> str:
        return re.sub(r'\{[^{}]*"ready"\s*:\s*true[^{}]*\}', '', text).strip()

    def respond(self, user_message: str, history: list, user: dict) -> str:
        from firebase_admin import firestore
        db = firestore.client()
        
        self.last_triage = None
        
        # 1. Detect crisis but DO NOT stop the AI. Just set a flag.
        is_emergency = self.is_crisis(user_message)

        messages = [{"role": "system", "content": THERAPIST_SYSTEM_PROMPT}]
        for msg in history[-12:]: messages.append({"role": msg["role"], "content": msg["content"]})
        
        # 2. Secretly force the AI to handle the crisis delicately
        if is_emergency:
            messages.append({
                "role": "system", 
                "content": "CRITICAL EMERGENCY: The user is in active crisis. Generate a highly empathetic, urgent, and comforting response in their preferred language ensuring they are not alone. State clearly that a licensed professional is being connected immediately."
            })
            
        messages.append({"role": "user", "content": user_message})

        try:
            raw, provider = self.engine.call(messages)
            tier_data = self.extract_tier_data(raw)
            clean_text = self.clean_response(raw)

            # 3. If it's an emergency, FORCE the dashboard to trigger Red Tier
            if is_emergency:
                if not tier_data: tier_data = {}
                tier_data["ready"] = True
                tier_data["intensity"] = 10
                tier_data["tier"] = "red"

            if tier_data and tier_data.get("ready"):
                # Determine the final tier
                intensity = tier_data.get("intensity", 0)
                if intensity >= 8: tier = "red"
                elif intensity >= 5: tier = "yellow"
                else: tier = tier_data.get("tier", "green").lower()

                tier_data["tier"] = tier
                self.last_triage = tier_data 

                # 🚀 PUSH TO DASHBOARD
                try:
                    db.collection('triage_logs').add({
                        'userPhone': user["phone"],
                        'message': user_message,
                        'triage': {
                            'targetRole': 'therapist' if tier == 'red' else 'student',
                            'listenerTier': tier
                        },
                        'timestamp': firestore.SERVER_TIMESTAMP
                    })
                    print(f"✅ Dashboard Synced: {tier.upper()} tier request pushed.")
                except Exception as e:
                    print(f"❌ Dashboard Sync Error: {e}")

                # Local save
                from database.db import save_session
                info = self._tier_info(tier)
                save_session(user["id"], user["phone"], tier, tier_data.get("reason", ""), tier_data.get("summary", ""), info["price"])
                
                return clean_text + "\n\n" + self._tier_message(tier, info)
                
            return clean_text
        except Exception as e:
            print(f"❌ Engine Error: {e}")
            return "Abhi thodi technical problem aa gayi hai. Ek minute mein dobara try karein."

    def _tier_info(self, tier: str):
        return {"green": {"price": 150, "listener": "Psychology student", "desc": "Mild stress"},
                "yellow": {"price": 250, "listener": "Masters student", "desc": "Moderate support"},
                "red": {"price": 2000, "listener": "Licensed therapist", "desc": "Full therapy"}}.get(tier, {"price": 150, "listener": "Support", "desc": "General"})

    def _tier_message(self, tier: str, info: dict):
        return f"Aapke liye {tier.capitalize()} tier recommend ki gayi hai.\n\nListener: {info['listener']}\nPrice: Rs.{info['price']}\nReply: HAAN ya NAHI"