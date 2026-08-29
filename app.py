from flask import Flask, render_template, request, jsonify
from google import genai
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file")

client = genai.Client(api_key=api_key)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()

        if not user_message:
            return jsonify({
                "reply": "Please enter a message."
            }), 400

        # Streaming Gemini response
        response_stream = client.models.generate_content_stream(
            model="gemini-3.7-flash",
            contents=user_message
        )

        full_response = ""

        for chunk in response_stream:
            if chunk.text:
                full_response += chunk.text

        return jsonify({
            "reply": full_response
        })

    except Exception as e:
        print("ERROR:", e)

        return jsonify({
            "reply": "Sorry, something went wrong. Please try again."
        }), 500


if __name__ == "__main__":
    app.run(debug=True)