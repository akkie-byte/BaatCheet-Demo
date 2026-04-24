from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)
CORS(app) # This allows "pretty" dashboard to talk to this script

from bs4 import BeautifulSoup
import random

# Temporary storage for demo OTPs
otp_store = {}

@app.route('/verify-and-send-otp', methods=['POST'])
def verify_and_otp():
    data = request.json
    rci_id = data.get('rci')
    input_name = data.get('name', '').strip().upper()
    email = data.get('email')

    url = "https://rciregistration.nic.in/rehabcouncil/Select_Search.jsp"
    payload = {'registration_no': rci_id, 'submit': 'Search'}

    try:
        response = requests.post(url, data=payload, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Pulling the name from the RCI result table
        registry_text = soup.get_text().upper()
        
        # Verify if the name Akshita (User) entered exists in the RCI record
        if input_name in registry_text:
            # Generate OTP
            otp = str(random.randint(100000, 999999))
            otp_store[email] = otp
            
            # For your demo, we print it to console (or add SMTP code here)
            print(f"DEBUG: OTP for {email} is {otp}") 
            return jsonify({"status": "success"})
        else:
            return jsonify({"status": "failed", "message": "Name does not match RCI records"})

    except Exception as e:
        return jsonify({"status": "error", "message": "Registry server unreachable"})

@app.route('/confirm-otp', methods=['POST'])
def confirm_otp():
    data = request.json
    email = data.get('email')
    user_otp = data.get('otp')

    if otp_store.get(email) == user_otp:
        return jsonify({"status": "success"})
    return jsonify({"status": "failed"})
 
if __name__ == '__main__':
    app.run(port=5000, debug=True)