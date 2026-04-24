from flask import Flask, request, jsonify

app = Flask(__name__)

def calculate_stress_level(text):
    text = text.lower()
    # Keywords that indicate higher emotional distress
    keywords = ['sad', 'alone', 'stress', 'pareshan', 'dukh', 'help', 'rone', 'preshan']
    score = sum(1 for word in keywords if word in text)
    return score

@app.route('/analyze', methods=['POST'])
def analyze():
    # Node.js will send the message here
    data = request.json
    user_text = data.get('text', '')
    
    stress_score = calculate_stress_level(user_text)
    
    # Return the score back to Node.js
    return jsonify({
        "stress_score": stress_score,
        "is_urgent": stress_score > 2
    })

if __name__ == '__main__':
    # Running on Port 5000
    app.run(port=5000, debug=True)