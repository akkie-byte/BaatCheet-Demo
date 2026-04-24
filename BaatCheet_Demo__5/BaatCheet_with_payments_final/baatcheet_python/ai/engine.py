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
        self.last_triage = None
        if self.is_crisis(user_message): return CRISIS_RESPONSE

        messages = [{"role": "system", "content": THERAPIST_SYSTEM_PROMPT}]
        for msg in history[-12:]: messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})

        try:
            raw, provider = self.engine.call(messages)
            tier_data = self.extract_tier_data(raw)
            clean_text = self.clean_response(raw)

            if tier_data and tier_data.get("ready"):
                intensity = tier_data.get("intensity", 0)
                if intensity >= 8: tier = "red"
                elif intensity >= 5: tier = "yellow"
                else: tier = tier_data.get("tier", "green").lower()

                tier_data["tier"] = tier
                self.last_triage = tier_data # Save BEFORE return so bridge sees it

                from database.db import save_session
                info = self._tier_info(tier)
                save_session(user["id"], user["phone"], tier, tier_data.get("reason", ""), tier_data.get("summary", ""), info["price"])
                return clean_text + "\n\n" + self._tier_message(tier, info)
            return clean_text
        except Exception:
            return "Abhi thodi technical problem aa gayi hai. Ek minute mein dobara try karein."

    def _tier_info(self, tier: str):
        return {"green": {"price": 150, "listener": "Psychology student", "desc": "Mild stress"},
                "yellow": {"price": 250, "listener": "Masters student", "desc": "Moderate support"},
                "red": {"price": 2000, "listener": "Licensed therapist", "desc": "Full therapy"}}.get(tier, {"price": 150, "listener": "Support", "desc": "General"})

    def _tier_message(self, tier: str, info: dict):
        return f"Aapke liye {tier.capitalize()} tier recommend ki gayi hai.\n\nListener: {info['listener']}\nPrice: Rs.{info['price']}\nReply: HAAN ya NAHI"