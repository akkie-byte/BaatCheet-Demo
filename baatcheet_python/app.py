import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from database.db import get_or_create_user, save_message, get_conversation_history
from ai.engine import BaatcheetAI

load_dotenv()
app = Flask(__name__)
CORS(app)
baatcheet = BaatcheetAI()

@app.route("/api/ai/consult", methods=["POST"])
def api_consult():
    """Node.js calls this to get Dr. Prachi's logic and Triage data."""
    data = request.json
    message = data.get("message")
    phone = data.get("phone")
    
    user = get_or_create_user(phone)
    history = get_conversation_history(user["id"])
    
    # Python calculates the reply
    response = baatcheet.respond(message, history, user)
    
    return jsonify({
        "reply": response,
        "tier": "red" if "Therapist" in response or "Red" in response else "green" 
    })

# 🔴 ADD THIS ROUTE SO NODE CAN MUTE THE AI
@app.route("/api/bridge/connect", methods=["POST"])
def bridge_connect():
    print("✅ Node.js told Python to mute AI!")
    return jsonify({"status": "success"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
