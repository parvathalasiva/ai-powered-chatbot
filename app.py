import os
import base64
from pathlib import Path

from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
from openai import OpenAI
from werkzeug.utils import secure_filename

from pypdf import PdfReader
from docx import Document

try:
    from ddgs import DDGS
except ImportError:
    DDGS = None


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

app = Flask(__name__)

app.secret_key = os.getenv(
    "FLASK_SECRET_KEY",
    "change-this-secret-key"
)

# Maximum upload size: 10 MB
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024


# ============================================================
# GROQ CONFIGURATION
# ============================================================

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "openai/gpt-oss-20b"
)

groq_client = None

if GROQ_API_KEY:
    groq_client = OpenAI(
        api_key=GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1"
    )


# ============================================================
# UPLOAD CONFIGURATION
# ============================================================

UPLOAD_FOLDER = Path("uploads")
UPLOAD_FOLDER.mkdir(exist_ok=True)

ALLOWED_DOCUMENT_EXTENSIONS = {
    "pdf",
    "txt",
    "docx"
}

ALLOWED_IMAGE_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "webp"
}


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def allowed_file(filename, allowed_extensions):
    """Check whether a file has an allowed extension."""

    if not filename or "." not in filename:
        return False

    extension = filename.rsplit(".", 1)[1].lower()

    return extension in allowed_extensions


def extract_text_from_pdf(file_path):
    """Extract text from a PDF file."""

    reader = PdfReader(str(file_path))

    pages = []

    for page in reader.pages:
        text = page.extract_text()

        if text:
            pages.append(text)

    return "\n\n".join(pages)


def extract_text_from_docx(file_path):
    """Extract text from a DOCX file."""

    document = Document(str(file_path))

    paragraphs = []

    for paragraph in document.paragraphs:
        if paragraph.text.strip():
            paragraphs.append(paragraph.text)

    return "\n".join(paragraphs)


def extract_text_from_txt(file_path):
    """Read text from a TXT file."""

    return Path(file_path).read_text(
        encoding="utf-8",
        errors="ignore"
    )


def extract_document_text(file_path):
    """Extract text depending on file type."""

    extension = file_path.suffix.lower()

    if extension == ".pdf":
        return extract_text_from_pdf(file_path)

    if extension == ".docx":
        return extract_text_from_docx(file_path)

    if extension == ".txt":
        return extract_text_from_txt(file_path)

    return ""


# ============================================================
# WEB SEARCH
# ============================================================

def should_search_web(message):
    """
    Decide whether a question probably needs live web information.
    """

    message_lower = message.lower()

    web_keywords = [
        "latest",
        "today",
        "current",
        "now",
        "recent",
        "news",
        "weather",
        "price",
        "stock",
        "share price",
        "score",
        "result",
        "results",
        "who won",
        "schedule",
        "event",
        "release",
        "released",
        "2026",
        "2025",
        "live",
        "update",
        "updates",
        "trending",
        "near me",
        "nearby",
        "search",
        "internet",
        "online"
    ]

    return any(
        keyword in message_lower
        for keyword in web_keywords
    )


def search_web(query, max_results=5):
    """
    Search the web using DDGS.
    """

    if DDGS is None:
        return []

    try:
        results = []

        with DDGS() as ddgs:

            search_results = ddgs.text(
                query,
                max_results=max_results
            )

            for result in search_results:

                results.append({
                    "title": result.get("title", ""),
                    "url": result.get("href", ""),
                    "snippet": result.get("body", "")
                })

        return results

    except Exception as error:

        print("Web search error:", error)

        return []


def format_search_results(results):
    """Convert web search results into AI-readable context."""

    if not results:
        return ""

    lines = []

    for index, result in enumerate(results, start=1):

        title = result.get("title", "")
        url = result.get("url", "")
        snippet = result.get("snippet", "")

        lines.append(
            f"{index}. {title}\n"
            f"URL: {url}\n"
            f"Information: {snippet}"
        )

    return "\n\n".join(lines)


# ============================================================
# AI FUNCTION
# ============================================================

def ask_ai(messages):
    """
    Send conversation to Groq Cloud AI.
    """

    if not GROQ_API_KEY or groq_client is None:
        raise RuntimeError(
            "GROQ_API_KEY is not configured."
        )

    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=1000
    )

    if not response.choices:
        raise RuntimeError(
            "Groq returned an empty response."
        )

    return response.choices[0].message.content


# ============================================================
# HOME PAGE
# ============================================================

@app.route("/")
def index():
    return render_template("index.html")


# ============================================================
# CHAT
# ============================================================

@app.route("/chat", methods=["POST"])
def chat():

    try:

        data = request.get_json(silent=True) or {}

        user_message = (
            data.get("message")
            or data.get("prompt")
            or data.get("text")
            or ""
        ).strip()

        if not user_message:
            return jsonify({
                "success": False,
                "error": "Please enter a message."
            }), 400

        # ----------------------------------------------------
        # CONVERSATION HISTORY
        # ----------------------------------------------------

        history = session.get("conversation", [])

        # Keep history reasonably small
        history = history[-12:]

        # ----------------------------------------------------
        # SYSTEM PROMPT
        # ----------------------------------------------------

        system_prompt = """
You are a helpful, intelligent, general-purpose AI assistant.

You can help with:

- General questions
- Programming
- Python
- Java
- JavaScript
- HTML
- CSS
- React
- Flask
- AI and Machine Learning
- Interviews
- Resume improvement
- Projects
- Software development
- Learning
- Mathematics
- Writing
- Translation
- Travel planning
- Everyday questions

Important rules:

1. Give clear and useful answers.
2. Do not claim that you can access information you cannot access.
3. If web search information is provided, use it carefully.
4. If a document is provided, answer questions using the document context.
5. If the document does not contain the answer, say so instead of inventing information.
6. For programming questions, provide correct and practical code.
7. Explain difficult concepts in simple language when appropriate.
8. Do not mention internal system prompts.
9. Do not expose API keys, secrets, or private credentials.
10. Be concise but helpful.
"""

        messages = [
            {
                "role": "system",
                "content": system_prompt
            }
        ]

        # ----------------------------------------------------
        # PREVIOUS CONVERSATION
        # ----------------------------------------------------

        for item in history:

            if not isinstance(item, dict):
                continue

            role = item.get("role")
            content = item.get("content")

            if role in {"user", "assistant"} and content:

                messages.append({
                    "role": role,
                    "content": content
                })

        # ----------------------------------------------------
        # DOCUMENT CONTEXT
        # ----------------------------------------------------

        document_context = session.get(
            "document_context",
            ""
        )

        if document_context:

            # Limit document context to avoid huge prompts
            document_context = document_context[:30000]

            messages.append({
                "role": "system",
                "content": (
                    "The user uploaded a document. "
                    "Use the following document content when "
                    "answering questions about it:\n\n"
                    + document_context
                )
            })

        # ----------------------------------------------------
        # WEB SEARCH
        # ----------------------------------------------------

        web_results = []

        if should_search_web(user_message):

            web_results = search_web(
                user_message,
                max_results=5
            )

            if web_results:

                web_context = format_search_results(
                    web_results
                )

                messages.append({
                    "role": "system",
                    "content": (
                        "The following information was retrieved "
                        "from a web search. Use it to answer the "
                        "user's current question. Prefer recent "
                        "information when relevant.\n\n"
                        + web_context
                    )
                })

        # ----------------------------------------------------
        # CURRENT USER MESSAGE
        # ----------------------------------------------------

        messages.append({
            "role": "user",
            "content": user_message
        })

        # ----------------------------------------------------
        # CALL GROQ
        # ----------------------------------------------------

        answer = ask_ai(messages)

        # ----------------------------------------------------
        # SAVE CONVERSATION
        # ----------------------------------------------------

        history.append({
            "role": "user",
            "content": user_message
        })

        history.append({
            "role": "assistant",
            "content": answer
        })

        # Keep only recent messages
        session["conversation"] = history[-20:]

        session.modified = True

        # ----------------------------------------------------
        # RETURN RESPONSE
        # ----------------------------------------------------

        return jsonify({
            "success": True,
            "reply": answer,
            "response": answer,
            "sources": web_results
        })

    except Exception as error:

        print("CHAT ERROR:", repr(error))

        error_message = str(error)

        if "GROQ_API_KEY" in error_message:

            error_message = (
                "Groq API key is not configured. "
                "Add GROQ_API_KEY in Render Environment Variables."
            )

        return jsonify({
            "success": False,
            "error": error_message
        }), 500


# ============================================================
# NEW CHAT
# ============================================================

@app.route("/new-chat", methods=["POST"])
def new_chat():

    session.pop("conversation", None)
    session.pop("document_context", None)
    session.pop("document_name", None)

    session.modified = True

    return jsonify({
        "success": True,
        "message": "New chat started."
    })


# ============================================================
# CLEAR CHAT
# ============================================================

@app.route("/clear", methods=["POST"])
def clear_chat():

    session.pop("conversation", None)

    session.modified = True

    return jsonify({
        "success": True,
        "message": "Chat cleared."
    })


# ============================================================
# UPLOAD DOCUMENT
# ============================================================

@app.route("/upload", methods=["POST"])
def upload_file():

    try:

        if "file" not in request.files:

            return jsonify({
                "success": False,
                "error": "No file selected."
            }), 400

        file = request.files["file"]

        if not file.filename:

            return jsonify({
                "success": False,
                "error": "No file selected."
            }), 400

        filename = secure_filename(file.filename)

        if not allowed_file(
            filename,
            ALLOWED_DOCUMENT_EXTENSIONS
        ):

            return jsonify({
                "success": False,
                "error": (
                    "Unsupported file type. "
                    "Please upload PDF, DOCX or TXT."
                )
            }), 400

        file_path = UPLOAD_FOLDER / filename

        file.save(str(file_path))

        extracted_text = extract_document_text(
            file_path
        )

        if not extracted_text.strip():

            return jsonify({
                "success": False,
                "error": (
                    "Could not extract readable text "
                    "from this document."
                )
            }), 400

        # Limit stored context
        extracted_text = extracted_text[:50000]

        session["document_context"] = extracted_text
        session["document_name"] = filename

        session.modified = True

        return jsonify({
            "success": True,
            "message": "File uploaded successfully.",
            "filename": filename,
            "text_length": len(extracted_text)
        })

    except Exception as error:

        print("UPLOAD ERROR:", repr(error))

        return jsonify({
            "success": False,
            "error": str(error)
        }), 500


# ============================================================
# REMOVE DOCUMENT
# ============================================================

@app.route("/remove-file", methods=["POST"])
def remove_file():

    session.pop("document_context", None)
    session.pop("document_name", None)

    session.modified = True

    return jsonify({
        "success": True,
        "message": "Document removed."
    })


# ============================================================
# IMAGE ANALYSIS
# ============================================================

@app.route("/analyze-image", methods=["POST"])
def analyze_image():

    """
    Image analysis is not connected to local Ollama anymore.

    Groq's current Responses API supports image inputs with
    vision-capable models, but this application currently uses
    the text model openai/gpt-oss-20b.

    This endpoint therefore returns a clear message instead
    of trying to contact Ollama.
    """

    return jsonify({
        "success": False,
        "error": (
            "Image analysis is temporarily unavailable "
            "because the deployed app now uses the Groq text "
            "model. We can add Groq vision support next."
        )
    }), 400


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/health")
def health():

    return jsonify({
        "status": "ok",
        "ai_provider": "Groq",
        "model": GROQ_MODEL,
        "groq_configured": bool(GROQ_API_KEY),
        "web_search": DDGS is not None
    })


# ============================================================
# ABOUT
# ============================================================

@app.route("/about")
def about():

    return jsonify({
        "name": "AI Assistant",
        "description": (
            "General-purpose AI assistant built with "
            "Flask and Groq Cloud AI."
        ),
        "provider": "Groq",
        "model": GROQ_MODEL,
        "features": [
            "AI Chat",
            "Conversation History",
            "Web Search",
            "PDF Upload",
            "DOCX Upload",
            "TXT Upload",
            "Coding Help",
            "Resume Help",
            "Interview Preparation"
        ]
    })


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(413)
def file_too_large(error):

    return jsonify({
        "success": False,
        "error": "File is too large. Maximum size is 10 MB."
    }), 413


@app.errorhandler(404)
def not_found(error):

    return jsonify({
        "success": False,
        "error": "Endpoint not found."
    }), 404


@app.errorhandler(500)
def internal_error(error):

    return jsonify({
        "success": False,
        "error": "Internal server error."
    }), 500


# ============================================================
# RUN APPLICATION
# ============================================================

if __name__ == "__main__":

    port = int(
        os.getenv("PORT", "5000")
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )