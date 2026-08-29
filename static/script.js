const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const chatBox = document.getElementById("chat-box");
const typing = document.getElementById("typing");


// Add message to chat
function addMessage(message, sender) {

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");

    if (sender === "user") {
        messageDiv.classList.add("user-message");
    } else {
        messageDiv.classList.add("bot-message");
    }

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");

    avatar.textContent = sender === "user" ? "👤" : "🤖";


    const content = document.createElement("div");
    content.classList.add("message-content");

    const paragraph = document.createElement("p");
    paragraph.textContent = message;

    content.appendChild(paragraph);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    chatBox.appendChild(messageDiv);

    // Scroll to latest message
    chatBox.scrollTop = chatBox.scrollHeight;
}


// Send message
async function sendMessage() {

    const message = messageInput.value.trim();

    if (!message) {
        return;
    }

    // Display user message
    addMessage(message, "user");

    // Clear input
    messageInput.value = "";

    // Disable input while waiting
    sendButton.disabled = true;
    messageInput.disabled = true;

    // Show typing
    typing.style.display = "block";

    try {

        const response = await fetch("/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: message
            })
        });


        const data = await response.json();


        if (response.ok) {

            addMessage(
                data.reply || "No response received.",
                "bot"
            );

        } else {

            addMessage(
                data.reply || "Something went wrong.",
                "bot"
            );
        }


    } catch (error) {

        console.error("Error:", error);

        addMessage(
            "Unable to connect to the server. Please try again.",
            "bot"
        );

    } finally {

        // Hide typing
        typing.style.display = "none";

        // Enable input again
        sendButton.disabled = false;
        messageInput.disabled = false;

        // Put cursor back in input
        messageInput.focus();
    }
}


// Send when button is clicked
sendButton.addEventListener("click", sendMessage);


// Send when Enter is pressed
messageInput.addEventListener("keydown", function(event) {

    if (event.key === "Enter" && !event.shiftKey) {

        event.preventDefault();

        sendMessage();
    }
});