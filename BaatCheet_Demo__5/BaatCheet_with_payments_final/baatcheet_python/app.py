from flask import Flask, request, jsonify
from dotenv import load_dotenv
from twilio.rest import Client
import os

load_dotenv()
from database.db import get_or_create_user, save_message, get_conversation_history, get_all_sessions, update_session_status, get_stats
from ai.engine import BaatcheetAI

app = Flask(__name__)
baatcheet = BaatcheetAI()

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

def send_whatsapp(to_number: str, message: str):
    try: twilio_client.messages.create(from_=TWILIO_WHATSAPP_NUMBER, to=f"whatsapp:{to_number}", body=message)
    except Exception as e: print(f"[Twilio] Error: {e}")

@app.route("/api/ai/consult", methods=["POST"])
def api_consult():
    data = request.json
    user = get_or_create_user(data.get("phone"))
    history = get_conversation_history(user["id"])
    
    # Existing logic: Get the Dr. Prachi response
    response_text = baatcheet.respond(user_message=data.get("message"), history=history, user=user)
    
    # ADD-ON: Pull the triage results calculated in engine.py
    triage_data = getattr(baatcheet, 'last_triage', {}) or {}
    
    return jsonify({
        "reply": response_text,
        "tier": triage_data.get("tier", "green").lower(), #
        "intensity": triage_data.get("intensity", 3),     #
        "crisis": baatcheet.is_crisis(data.get("message")),
        "provider": baatcheet.engine.current_provider
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)