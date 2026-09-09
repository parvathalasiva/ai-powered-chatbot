"use strict";

/*
============================================================
 AI ASSISTANT - COMPLETE SCRIPT.JS
 Works with:
     Flask app.py
     Ollama
     llama3.2:3b
     /chat
     /health
     /history
     /new-chat
     /clear
     /upload-document
     /remove-file
     /document-status
     /analyze-image

 Features:
     - Normal chat
     - Enter to send
     - Shift + Enter = new line
     - Send button
     - Loading state
     - Dark mode
     - New Chat
     - Clear Chat
     - About modal
     - Coding Help
     - Ideas & Learning
     - General Chat
     - Python
     - Interview Prep
     - Projects
     - Machine Learning
     - Voice input
     - Document upload
     - Image upload
     - Chat history
     - Health check
     - Error handling
     - Mobile sidebar
============================================================
*/

document.addEventListener("DOMContentLoaded", function () {

    console.log("AI Assistant JavaScript loaded successfully.");

    /* ========================================================
       DOM HELPERS
    ======================================================== */

    function getElement(selectors) {

        if (!Array.isArray(selectors)) {
            selectors = [selectors];
        }

        for (const selector of selectors) {

            const element = document.querySelector(selector);

            if (element) {
                return element;
            }
        }

        return null;
    }

    function getElements(selector) {
        return Array.from(
            document.querySelectorAll(selector)
        );
    }


    /* ========================================================
       MAIN ELEMENTS
    ======================================================== */

    const sidebar = getElement([
        ".sidebar",
        "#sidebar"
    ]);

    const overlay = getElement([
        ".sidebar-overlay",
        "#sidebarOverlay",
        ".overlay"
    ]);

    const mobileMenuButton = getElement([
        "#mobileMenuButton",
        "#menuButton",
        ".mobile-menu-button",
        ".menu-button"
    ]);

    const newChatButton = getElement([
        "#newChatButton",
        "#newChatBtn",
        ".new-chat-btn",
        ".new-chat-button"
    ]);

    const clearChatButton = getElement([
        "#clearChatButton",
        "#clearChatBtn",
        ".clear-chat-btn",
        ".clear-chat-button"
    ]);

    const themeButton = getElement([
        "#themeButton",
        "#themeToggle",
        ".theme-toggle",
        ".theme-button"
    ]);

    const themeIcon = getElement([
        "#themeIcon",
        ".theme-icon"
    ]);

    const themeText = getElement([
        "#themeText",
        ".theme-text"
    ]);

    const aboutButton = getElement([
        "#aboutButton",
        "#aboutBtn",
        ".about-button",
        ".about-btn"
    ]);

    const aboutModal = getElement([
        "#aboutModal",
        ".about-modal"
    ]);

    const aboutCloseButton = getElement([
        "#aboutClose",
        "#closeAbout",
        ".about-close",
        ".modal-close"
    ]);


    /* ========================================================
       CHAT ELEMENTS
    ======================================================== */

    const chatArea = getElement([
        "#chatArea",
        ".chat-area",
        ".chat-container",
        "main"
    ]);

    const welcomeScreen = getElement([
        "#welcomeScreen",
        ".welcome-screen"
    ]);

    const messagesContainer = getElement([
        "#messagesContainer",
        "#messages",
        ".messages",
        ".chat-messages"
    ]);

    const messageInput = getElement([
        "#messageInput",
        "#userInput",
        "#chatInput",
        "textarea[name='message']",
        "textarea"
    ]);

    const sendButton = getElement([
        "#sendButton",
        "#sendBtn",
        ".send-button",
        ".send-btn"
    ]);

    const micButton = getElement([
        "#micButton",
        "#micBtn",
        ".mic-button",
        ".microphone-button"
    ]);

    const voiceStatus = getElement([
        "#voiceStatus",
        ".voice-status"
    ]);


    /* ========================================================
       ATTACHMENT ELEMENTS
    ======================================================== */

    const attachmentButton = getElement([
        "#attachmentButton",
        "#attachButton",
        "#attachmentBtn",
        ".attachment-button",
        ".attach-button"
    ]);

    const attachmentMenu = getElement([
        "#attachmentMenu",
        ".attachment-menu"
    ]);

    const documentInput = getElement([
        "#documentInput",
        "#fileInput",
        "#documentFile",
        "input[type='file'][accept*='pdf']"
    ]);

    const imageInput = getElement([
        "#imageInput",
        "#imageFile",
        "input[type='file'][accept*='image']"
    ]);

    const documentButton = getElement([
        "#documentButton",
        "#uploadDocumentButton",
        ".document-button",
        ".upload-document"
    ]);

    const imageButton = getElement([
        "#imageButton",
        "#uploadImageButton",
        ".image-button",
        ".upload-image"
    ]);


    /* ========================================================
       TOAST
    ======================================================== */

    const toast = getElement([
        "#toast",
        ".toast",
        ".notification"
    ]);

    let toastTimer = null;


    /* ========================================================
       APPLICATION STATE
    ======================================================== */

    let isGenerating = false;

    let isRecording = false;

    let recognition = null;

    let recognitionSupported = false;

    let currentRequestController = null;

    let historyLoaded = false;

    let attachedDocument = null;


    /* ========================================================
       UTILITY
    ======================================================== */

    function escapeHtml(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function showToast(message, type = "info") {

        if (!toast) {
            console.log("Toast:", message);
            return;
        }

        toast.textContent = message;

        toast.classList.remove(
            "show",
            "success",
            "error",
            "warning",
            "info"
        );

        toast.classList.add(type);

        requestAnimationFrame(function () {
            toast.classList.add("show");
        });

        clearTimeout(toastTimer);

        toastTimer = setTimeout(function () {

            toast.classList.remove("show");

        }, 3500);
    }


    function scrollToBottom() {

        if (!messagesContainer) {
            return;
        }

        messagesContainer.scrollTop =
            messagesContainer.scrollHeight;

        if (chatArea) {
            chatArea.scrollTop =
                chatArea.scrollHeight;
        }
    }


    function showWelcome() {

        if (welcomeScreen) {
            welcomeScreen.style.display = "";
        }
    }


    function hideWelcome() {

        if (welcomeScreen) {
            welcomeScreen.style.display = "none";
        }
    }


    /* ========================================================
       MARKDOWN FORMATTER
    ======================================================== */

    function formatMarkdown(text) {

        if (text === null || text === undefined) {
            return "";
        }

        let value = String(text);

        /*
        Preserve code blocks first.
        */

        const codeBlocks = [];

        value = value.replace(
            /```([\w+-]*)\n?([\s\S]*?)```/g,
            function (_, language, code) {

                const index = codeBlocks.length;

                const safeCode = escapeHtml(
                    code.trim()
                );

                const languageName =
                    language
                        ? escapeHtml(language)
                        : "";

                codeBlocks.push(
                    '<pre class="code-block">' +
                    '<code data-language="' +
                    languageName +
                    '">' +
                    safeCode +
                    "</code>" +
                    "</pre>"
                );

                return "\n___CODE_BLOCK_" +
                    index +
                    "____\n";
            }
        );

        value = escapeHtml(value);

        /*
        Inline code
        */

        value = value.replace(
            /`([^`\n]+)`/g,
            "<code>$1</code>"
        );

        /*
        Bold
        */

        value = value.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

        /*
        Italic
        */

        value = value.replace(
            /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
            "<em>$1</em>"
        );

        /*
        Markdown links
        */

        value = value.replace(
            /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        );

        /*
        Automatic URLs
        */

        value = value.replace(
            /(^|[\s>])(https?:\/\/[^\s<]+)/g,
            '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
        );

        /*
        Headings
        */

        value = value.replace(
            /^### (.+)$/gm,
            "<h4>$1</h4>"
        );

        value = value.replace(
            /^## (.+)$/gm,
            "<h3>$1</h3>"
        );

        value = value.replace(
            /^# (.+)$/gm,
            "<h2>$1</h2>"
        );

        /*
        Unordered list
        */

        value = value.replace(
            /(?:^|\n)([-*]) (.+)(?=\n|$)/g,
            function (_, bullet, item) {
                return "\n<li>" + item + "</li>";
            }
        );

        /*
        Ordered list
        */

        value = value.replace(
            /(?:^|\n)\d+\.\s+(.+)(?=\n|$)/g,
            function (_, item) {
                return "\n<oli>" + item + "</oli>";
            }
        );

        /*
        Convert consecutive li elements.
        */

        value = value.replace(
            /((?:<li>.*?<\/li>\s*)+)/gs,
            "<ul>$1</ul>"
        );

        /*
        Convert consecutive ordered items.
        */

        value = value.replace(
            /((?:<oli>.*?<\/oli>\s*)+)/gs,
            function (_, list) {

                return (
                    "<ol>" +
                    list.replace(
                        /<oli>/g,
                        "<li>"
                    ).replace(
                        /<\/oli>/g,
                        "</li>"
                    ) +
                    "</ol>"
                );
            }
        );

        /*
        Horizontal line
        */

        value = value.replace(
            /^---$/gm,
            "<hr>"
        );

        /*
        Paragraphs
        */

        const lines = value
            .split(/\n{2,}/)
            .map(function (part) {

                const trimmed = part.trim();

                if (!trimmed) {
                    return "";
                }

                if (
                    trimmed.startsWith("<h2>") ||
                    trimmed.startsWith("<h3>") ||
                    trimmed.startsWith("<h4>") ||
                    trimmed.startsWith("<pre") ||
                    trimmed.startsWith("<ul>") ||
                    trimmed.startsWith("<ol>") ||
                    trimmed.startsWith("<hr>")
                ) {
                    return trimmed;
                }

                return (
                    "<p>" +
                    trimmed.replace(/\n/g, "<br>") +
                    "</p>"
                );
            })
            .filter(Boolean);

        value = lines.join("");

        /*
        Restore code blocks.
        */

        codeBlocks.forEach(
            function (block, index) {

                value = value.replace(
                    "___CODE_BLOCK_" +
                    index +
                    "____",
                    block
                );
            }
        );

        return value;
    }


    /* ========================================================
       ADD USER MESSAGE
    ======================================================== */

    function addUserMessage(text) {

        if (!messagesContainer) {
            return null;
        }

        hideWelcome();

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "message-row user-message-row";

        wrapper.innerHTML =
            '<div class="message user-message">' +
            '<div class="message-content">' +
            escapeHtml(text)
            .replace(/\n/g, "<br>") +
            "</div>" +
            "</div>";

        messagesContainer.appendChild(
            wrapper
        );

        scrollToBottom();

        return wrapper;
    }


    /* ========================================================
       ADD ASSISTANT MESSAGE
    ======================================================== */

    function addAssistantMessage(
        text,
        sources = []
    ) {

        if (!messagesContainer) {
            return null;
        }

        hideWelcome();

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "message-row assistant-message-row";

        let sourceHtml = "";

        if (
            Array.isArray(sources) &&
            sources.length > 0
        ) {

            sourceHtml =
                '<div class="message-sources">' +
                "<strong>Sources:</strong>";

            sources.forEach(
                function (source) {

                    if (!source) {
                        return;
                    }

                    const title =
                        escapeHtml(
                            source.title ||
                            source.name ||
                            "Source"
                        );

                    const url =
                        source.url ||
                        source.href ||
                        "";

                    if (url) {

                        sourceHtml +=
                            '<a href="' +
                            escapeHtml(url) +
                            '" target="_blank" rel="noopener noreferrer">' +
                            title +
                            "</a>";

                    } else {

                        sourceHtml +=
                            "<span>" +
                            title +
                            "</span>";
                    }
                }
            );

            sourceHtml +=
                "</div>";
        }

        wrapper.innerHTML =
            '<div class="message assistant-message">' +
            '<div class="message-content">' +
            formatMarkdown(text) +
            "</div>" +
            sourceHtml +
            "</div>";

        messagesContainer.appendChild(
            wrapper
        );

        scrollToBottom();

        return wrapper;
    }


    /* ========================================================
       TYPING MESSAGE
    ======================================================== */

    function addTypingMessage() {

        if (!messagesContainer) {
            return null;
        }

        hideWelcome();

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "message-row assistant-message-row typing-row";

        wrapper.innerHTML =
            '<div class="message assistant-message typing-message">' +
            '<div class="typing-indicator">' +
            "<span></span>" +
            "<span></span>" +
            "<span></span>" +
            "</div>" +
            "</div>";

        messagesContainer.appendChild(
            wrapper
        );

        scrollToBottom();

        return wrapper;
    }


    /* ========================================================
       REMOVE TYPING MESSAGE
    ======================================================== */

    function removeTypingMessage(
        typingElement
    ) {

        if (
            typingElement &&
            typingElement.parentNode
        ) {

            typingElement.parentNode.removeChild(
                typingElement
            );
        }
    }


    /* ========================================================
       UPDATE SEND BUTTON
    ======================================================== */

    function updateSendButton() {

        if (!sendButton) {
            return;
        }

        const hasText =
            messageInput &&
            messageInput.value.trim().length > 0;

        sendButton.disabled =
            isGenerating ||
            !hasText;

        if (isGenerating) {

            sendButton.classList.add(
                "loading"
            );

            sendButton.setAttribute(
                "aria-label",
                "Generating response"
            );

        } else {

            sendButton.classList.remove(
                "loading"
            );

            sendButton.setAttribute(
                "aria-label",
                "Send message"
            );
        }
    }


    /* ========================================================
       AUTO RESIZE TEXTAREA
    ======================================================== */

    function autoResizeTextarea() {

        if (!messageInput) {
            return;
        }

        messageInput.style.height = "auto";

        const maxHeight = 180;

        const newHeight =
            Math.min(
                messageInput.scrollHeight,
                maxHeight
            );

        messageInput.style.height =
            newHeight + "px";
    }


    /* ========================================================
       THEME
    ======================================================== */

    const THEME_KEY =
        "ai-assistant-theme";


    function applyTheme(theme) {

        const isDark =
            theme === "dark";

        document.documentElement.classList.toggle(
            "dark-mode",
            isDark
        );

        document.body.classList.toggle(
            "dark-mode",
            isDark
        );

        document.documentElement.setAttribute(
            "data-theme",
            isDark
                ? "dark"
                : "light"
        );

        if (themeIcon) {

            themeIcon.textContent =
                isDark
                    ? "☀️"
                    : "🌙";
        }

        if (themeText) {

            themeText.textContent =
                isDark
                    ? "Light Mode"
                    : "Dark Mode";
        }

        if (themeButton) {

            themeButton.setAttribute(
                "aria-label",
                isDark
                    ? "Switch to light mode"
                    : "Switch to dark mode"
            );
        }
    }


    function initializeTheme() {

        let savedTheme =
            localStorage.getItem(
                THEME_KEY
            );

        if (!savedTheme) {

            savedTheme =
                window.matchMedia &&
                window.matchMedia(
                    "(prefers-color-scheme: dark)"
                ).matches
                    ? "dark"
                    : "light";
        }

        applyTheme(
            savedTheme
        );
    }


    function toggleTheme() {

        const currentTheme =
            document.documentElement.classList.contains(
                "dark-mode"
            )
                ? "dark"
                : "light";

        const newTheme =
            currentTheme === "dark"
                ? "light"
                : "dark";

        localStorage.setItem(
            THEME_KEY,
            newTheme
        );

        applyTheme(
            newTheme
        );
    }


    /* ========================================================
       SIDEBAR
    ======================================================== */

    function openSidebar() {

        if (sidebar) {

            sidebar.classList.add(
                "open"
            );

            sidebar.classList.add(
                "active"
            );
        }

        if (overlay) {

            overlay.classList.add(
                "show"
            );

            overlay.classList.add(
                "active"
            );
        }

        document.body.classList.add(
            "sidebar-open"
        );
    }


    function closeSidebar() {

        if (sidebar) {

            sidebar.classList.remove(
                "open"
            );

            sidebar.classList.remove(
                "active"
            );
        }

        if (overlay) {

            overlay.classList.remove(
                "show"
            );

            overlay.classList.remove(
                "active"
            );
        }

        document.body.classList.remove(
            "sidebar-open"
        );
    }


    function toggleSidebar() {

        if (!sidebar) {
            return;
        }

        const isOpen =
            sidebar.classList.contains(
                "open"
            ) ||
            sidebar.classList.contains(
                "active"
            );

        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }


    /* ========================================================
       RESET CHAT UI
    ======================================================== */

    function resetChatUI() {

        if (messagesContainer) {

            messagesContainer.innerHTML =
                "";
        }

        if (welcomeScreen) {

            welcomeScreen.style.display =
                "";
        }

        if (messageInput) {

            messageInput.value =
                "";

            messageInput.style.height =
                "auto";
        }

        attachedDocument = null;

        updateSendButton();

        scrollToBottom();

        if (messageInput) {

            setTimeout(
                function () {
                    messageInput.focus();
                },
                100
            );
        }
    }


    /* ========================================================
       NEW CHAT
    ======================================================== */

    async function createNewChat() {

        if (isGenerating) {

            showToast(
                "Please wait for the current response.",
                "warning"
            );

            return;
        }

        try {

            const response =
                await fetch(
                    "/new-chat",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials: "same-origin"
                    }
                );

            /*
            Even if backend returns an error,
            reset the UI locally.
            */

            if (!response.ok) {

                console.warn(
                    "New chat endpoint returned:",
                    response.status
                );
            }

        } catch (error) {

            console.warn(
                "New chat request failed:",
                error
            );
        }

        resetChatUI();

        showToast(
            "New chat started.",
            "success"
        );

        closeSidebar();
    }


    /* ========================================================
       CLEAR CHAT
    ======================================================== */

    async function clearChat() {

        if (isGenerating) {

            showToast(
                "Please wait for the current response.",
                "warning"
            );

            return;
        }

        try {

            const response =
                await fetch(
                    "/clear",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials: "same-origin"
                    }
                );

            if (!response.ok) {

                console.warn(
                    "Clear endpoint returned:",
                    response.status
                );
            }

        } catch (error) {

            console.warn(
                "Clear request failed:",
                error
            );
        }

        resetChatUI();

        showToast(
            "Chat cleared.",
            "success"
        );
    }


    /* ========================================================
       EXTRACT RESPONSE
    ======================================================== */

    function extractAnswer(data) {

        if (!data) {
            return "";
        }

        /*
        Main Flask response
        */

        if (
            typeof data.response ===
            "string" &&
            data.response.trim()
        ) {

            return data.response.trim();
        }

        /*
        Compatibility with reply
        */

        if (
            typeof data.reply ===
            "string" &&
            data.reply.trim()
        ) {

            return data.reply.trim();
        }

        /*
        Other common names
        */

        if (
            typeof data.answer ===
            "string" &&
            data.answer.trim()
        ) {

            return data.answer.trim();
        }

        if (
            typeof data.message ===
            "string" &&
            data.message.trim()
        ) {

            return data.message.trim();
        }

        return "";
    }


    /* ========================================================
       SEND MESSAGE
    ======================================================== */

    async function sendMessage() {

        if (isGenerating) {
            return;
        }

        if (!messageInput) {
            return;
        }

        const question =
            messageInput.value.trim();

        if (!question) {

            showToast(
                "Please enter a message.",
                "warning"
            );

            messageInput.focus();

            return;
        }

        /*
        Save current text before clearing.
        */

        messageInput.value = "";

        autoResizeTextarea();

        updateSendButton();

        /*
        Add user message.
        */

        addUserMessage(
            question
        );

        /*
        Loading state.
        */

        isGenerating = true;

        updateSendButton();

        const typingElement =
            addTypingMessage();

        /*
        Abort controller.
        */

        currentRequestController =
            new AbortController();

        try {

            const response =
                await fetch(
                    "/chat",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Accept":
                                "application/json"
                        },

                        credentials:
                            "same-origin",

                        body: JSON.stringify({
                            message: question
                        }),

                        signal:
                            currentRequestController.signal
                    }
                );

            removeTypingMessage(
                typingElement
            );

            /*
            Try to parse JSON.
            */

            let data = null;

            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";

            if (
                contentType.includes(
                    "application/json"
                )
            ) {

                data =
                    await response.json();

            } else {

                const text =
                    await response.text();

                try {

                    data =
                        JSON.parse(text);

                } catch (parseError) {

                    data = {
                        response: text
                    };
                }
            }

            /*
            HTTP error.
            */

            if (!response.ok) {

                const errorMessage =
                    extractAnswer(data) ||
                    "Server error. Please try again.";

                addAssistantMessage(
                    "⚠️ " +
                    errorMessage
                );

                showToast(
                    errorMessage,
                    "error"
                );

                return;
            }

            /*
            Extract answer.
            */

            const answer =
                extractAnswer(data);

            if (!answer) {

                addAssistantMessage(
                    "I did not receive an answer. Please try again."
                );

                console.error(
                    "Unexpected Flask response:",
                    data
                );

                showToast(
                    "The server returned no answer.",
                    "error"
                );

                return;
            }

            /*
            Display answer.
            */

            addAssistantMessage(
                answer,
                Array.isArray(data.sources)
                    ? data.sources
                    : []
            );

        } catch (error) {

            removeTypingMessage(
                typingElement
            );

            if (
                error.name ===
                "AbortError"
            ) {

                addAssistantMessage(
                    "Request cancelled."
                );

                return;
            }

            console.error(
                "Chat error:",
                error
            );

            let errorMessage =
                "Unable to connect to the AI Assistant.";

            if (
                error instanceof
                TypeError
            ) {

                errorMessage =
                    "Cannot connect to Flask. " +
                    "Make sure app.py is running.";
            }

            addAssistantMessage(
                "⚠️ " +
                errorMessage
            );

            showToast(
                errorMessage,
                "error"
            );

        } finally {

            isGenerating = false;

            currentRequestController =
                null;

            updateSendButton();

            if (messageInput) {

                messageInput.focus();
            }
        }
    }


    /* ========================================================
       STOP CURRENT REQUEST
    ======================================================== */

    function stopGeneration() {

        if (
            currentRequestController
        ) {

            currentRequestController.abort();

            currentRequestController =
                null;
        }

        isGenerating = false;

        updateSendButton();
    }


    /* ========================================================
       HEALTH CHECK
    ======================================================== */

    async function checkConnection(
        showNotification = false
    ) {

        try {

            const response =
                await fetch(
                    "/health",
                    {
                        method: "GET",

                        headers: {
                            "Accept":
                                "application/json"
                        },

                        credentials:
                            "same-origin",

                        cache: "no-store"
                    }
                );

            if (!response.ok) {

                throw new Error(
                    "Health check failed"
                );
            }

            const data =
                await response.json();

            console.log(
                "Health:",
                data
            );

            const modelReady =
                data.model_available === true;

            const ollamaReady =
                data.ollama === true;

            /*
            Update status indicators.
            */

            const statusElements =
                getElements(
                    ".status-dot, #statusDot"
                );

            statusElements.forEach(
                function (element) {

                    element.classList.toggle(
                        "online",
                        ollamaReady &&
                        modelReady
                    );

                    element.classList.toggle(
                        "offline",
                        !(
                            ollamaReady &&
                            modelReady
                        )
                    );
                }
            );

            const statusTextElements =
                getElements(
                    ".status-text, #statusText, #connectionStatus"
                );

            statusTextElements.forEach(
                function (element) {

                    if (
                        ollamaReady &&
                        modelReady
                    ) {

                        element.textContent =
                            "Online";

                    } else if (
                        ollamaReady &&
                        !modelReady
                    ) {

                        element.textContent =
                            "Model unavailable";

                    } else {

                        element.textContent =
                            "Offline";
                    }
                }
            );

            if (showNotification) {

                if (
                    ollamaReady &&
                    modelReady
                ) {

                    showToast(
                        "AI Assistant is ready.",
                        "success"
                    );

                } else if (
                    ollamaReady &&
                    !modelReady
                ) {

                    showToast(
                        "Ollama is running, but the chat model is not installed.",
                        "warning"
                    );

                } else {

                    showToast(
                        "Ollama is not running.",
                        "error"
                    );
                }
            }

            return data;

        } catch (error) {

            console.warn(
                "Health check error:",
                error
            );

            const statusTextElements =
                getElements(
                    ".status-text, #statusText, #connectionStatus"
                );

            statusTextElements.forEach(
                function (element) {
                    element.textContent =
                        "Offline";
                }
            );

            return null;
        }
    }


    /* ========================================================
       LOAD HISTORY
    ======================================================== */

    async function loadHistory() {

        if (
            historyLoaded ||
            !messagesContainer
        ) {
            return;
        }

        try {

            const response =
                await fetch(
                    "/history",
                    {
                        method: "GET",

                        headers: {
                            "Accept":
                                "application/json"
                        },

                        credentials:
                            "same-origin",

                        cache: "no-store"
                    }
                );

            if (!response.ok) {
                return;
            }

            const data =
                await response.json();

            const history =
                Array.isArray(data.history)
                    ? data.history
                    : [];

            if (
                history.length === 0
            ) {

                historyLoaded = true;

                showWelcome();

                return;
            }

            hideWelcome();

            history.forEach(
                function (item) {

                    /*
                    Backend format:
                    {
                        user: "...",
                        assistant: "...",
                        timestamp: "..."
                    }
                    */

                    const userText =
                        item.user ||
                        item.message ||
                        "";

                    const assistantText =
                        item.assistant ||
                        item.response ||
                        item.reply ||
                        "";

                    if (userText) {

                        addUserMessage(
                            userText
                        );
                    }

                    if (assistantText) {

                        addAssistantMessage(
                            assistantText
                        );
                    }
                }
            );

            historyLoaded = true;

            scrollToBottom();

        } catch (error) {

            console.warn(
                "Could not load history:",
                error
            );
        }
    }


    /* ========================================================
       FEATURE BUTTONS
    ======================================================== */

    function setupFeatureButtons() {

        const featureButtons =
            getElements(
                ".feature-item, .feature-button, [data-prompt]"
            );

        featureButtons.forEach(
            function (button) {

                if (
                    button.dataset
                        .featureListenerAdded
                ) {
                    return;
                }

                button.dataset
                    .featureListenerAdded =
                    "true";

                button.addEventListener(
                    "click",
                    function () {

                        let prompt =
                            button.dataset.prompt ||
                            button.dataset.message ||
                            button.getAttribute(
                                "data-prompt"
                            );

                        if (!prompt) {

                            const text =
                                button.textContent
                                    .trim()
                                    .toLowerCase();

                            if (
                                text.includes(
                                    "coding"
                                )
                            ) {

                                prompt =
                                    "Help me with programming and coding.";

                            } else if (
                                text.includes(
                                    "ideas"
                                ) ||
                                text.includes(
                                    "learning"
                                )
                            ) {

                                prompt =
                                    "Give me useful learning ideas and explain them.";

                            } else if (
                                text.includes(
                                    "python"
                                )
                            ) {

                                prompt =
                                    "Help me learn Python with examples.";

                            } else if (
                                text.includes(
                                    "interview"
                                )
                            ) {

                                prompt =
                                    "Help me prepare for a technical interview.";

                            } else if (
                                text.includes(
                                    "project"
                                )
                            ) {

                                prompt =
                                    "Suggest and explain a practical software project.";

                            } else if (
                                text.includes(
                                    "machine"
                                )
                            ) {

                                prompt =
                                    "Explain Machine Learning with examples.";

                            } else {

                                prompt =
                                    "Help me with this topic.";
                            }
                        }

                        if (messageInput) {

                            messageInput.value =
                                prompt;

                            autoResizeTextarea();

                            updateSendButton();

                            messageInput.focus();

                            /*
                            On mobile close sidebar.
                            */

                            if (
                                window.innerWidth <=
                                768
                            ) {

                                closeSidebar();
                            }
                        }
                    }
                );
            }
        );
    }


    /* ========================================================
       QUICK BUTTONS
    ======================================================== */

    function setupQuickButtons() {

        const quickButtons =
            getElements(
                ".quick-btn, .quick-button, [data-message]"
            );

        quickButtons.forEach(
            function (button) {

                if (
                    button.dataset
                        .quickListenerAdded
                ) {
                    return;
                }

                button.dataset
                    .quickListenerAdded =
                    "true";

                button.addEventListener(
                    "click",
                    function () {

                        const message =
                            button.dataset.message ||
                            button.dataset.prompt ||
                            button.textContent.trim();

                        if (!message) {
                            return;
                        }

                        if (messageInput) {

                            messageInput.value =
                                message;

                            autoResizeTextarea();

                            updateSendButton();

                            messageInput.focus();
                        }
                    }
                );
            }
        );
    }


    /* ========================================================
       ATTACHMENT MENU
    ======================================================== */

    function toggleAttachmentMenu() {

        if (!attachmentMenu) {
            return;
        }

        attachmentMenu.classList.toggle(
            "show"
        );

        attachmentMenu.classList.toggle(
            "active"
        );
    }


    function closeAttachmentMenu() {

        if (!attachmentMenu) {
            return;
        }

        attachmentMenu.classList.remove(
            "show"
        );

        attachmentMenu.classList.remove(
            "active"
        );
    }


    /* ========================================================
       DOCUMENT UPLOAD
    ======================================================== */

    async function uploadDocument(
        file
    ) {

        if (!file) {
            return;
        }

        const allowedTypes = [
            "pdf",
            "txt",
            "docx"
        ];

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();

        if (
            !allowedTypes.includes(
                extension
            )
        ) {

            showToast(
                "Only PDF, TXT and DOCX files are supported.",
                "error"
            );

            return;
        }

        if (
            file.size >
            10 * 1024 * 1024
        ) {

            showToast(
                "Maximum file size is 10 MB.",
                "error"
            );

            return;
        }

        const formData =
            new FormData();

        /*
        IMPORTANT:
        app.py accepts both:
            file
            document

        We use document here because
        /upload-document expects it.
        */

        formData.append(
            "document",
            file
        );

        showToast(
            "Uploading document...",
            "info"
        );

        try {

            const response =
                await fetch(
                    "/upload-document",
                    {
                        method: "POST",

                        body: formData,

                        credentials:
                            "same-origin"
                    }
                );

            let data = null;

            try {

                data =
                    await response.json();

            } catch (error) {

                data = {};
            }

            if (!response.ok) {

                const message =
                    extractAnswer(data) ||
                    "Document upload failed.";

                showToast(
                    message,
                    "error"
                );

                return;
            }

            attachedDocument =
                file.name;

            const message =
                extractAnswer(data) ||
                (
                    file.name +
                    " is ready for questions."
                );

            showToast(
                message,
                "success"
            );

            /*
            Add a small system message
            inside chat.
            */

            if (messagesContainer) {

                hideWelcome();

                const wrapper =
                    document.createElement(
                        "div"
                    );

                wrapper.className =
                    "message-row system-message-row";

                wrapper.innerHTML =
                    '<div class="message system-message">' +
                    '<div class="message-content">' +
                    "📄 <strong>" +
                    escapeHtml(
                        file.name
                    ) +
                    "</strong> is ready. You can now ask questions about it." +
                    "</div>" +
                    "</div>";

                messagesContainer.appendChild(
                    wrapper
                );

                scrollToBottom();
            }

        } catch (error) {

            console.error(
                "Document upload error:",
                error
            );

            showToast(
                "Could not upload document.",
                "error"
            );

        } finally {

            closeAttachmentMenu();

            if (documentInput) {
                documentInput.value = "";
            }
        }
    }


    /* ========================================================
       REMOVE DOCUMENT
    ======================================================== */

    async function removeDocument() {

        try {

            const response =
                await fetch(
                    "/remove-file",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials:
                            "same-origin"
                    }
                );

            if (!response.ok) {

                throw new Error(
                    "Remove document failed"
                );
            }

            attachedDocument =
                null;

            showToast(
                "Document removed.",
                "success"
            );

        } catch (error) {

            console.error(
                "Remove document error:",
                error
            );

            showToast(
                "Could not remove document.",
                "error"
            );
        }
    }


    /* ========================================================
       IMAGE ANALYSIS
    ======================================================== */

    async function analyzeImage(
        file
    ) {

        if (!file) {
            return;
        }

        const allowedTypes = [
            "image/png",
            "image/jpeg",
            "image/webp"
        ];

        if (
            !allowedTypes.includes(
                file.type
            )
        ) {

            showToast(
                "Use PNG, JPG, JPEG or WEBP image.",
                "error"
            );

            return;
        }

        if (
            file.size >
            10 * 1024 * 1024
        ) {

            showToast(
                "Maximum image size is 10 MB.",
                "error"
            );

            return;
        }

        const question =
            messageInput
                ? messageInput.value.trim()
                : "";

        const formData =
            new FormData();

        formData.append(
            "image",
            file
        );

        /*
        app.py accepts "prompt"
        and "question".
        */

        formData.append(
            "prompt",
            question ||
            "Describe this image and explain what you see."
        );

        showToast(
            "Analyzing image...",
            "info"
        );

        try {

            const response =
                await fetch(
                    "/analyze-image",
                    {
                        method: "POST",

                        body: formData,

                        credentials:
                            "same-origin"
                    }
                );

            let data = null;

            try {

                data =
                    await response.json();

            } catch (error) {

                data = {};
            }

            if (!response.ok) {

                const message =
                    extractAnswer(data) ||
                    "Image analysis failed.";

                showToast(
                    message,
                    "error"
                );

                return;
            }

            const answer =
                extractAnswer(data);

            if (!answer) {

                showToast(
                    "The vision model returned no answer.",
                    "error"
                );

                return;
            }

            /*
            If the user entered a question,
            show it first.
            */

            if (question) {

                addUserMessage(
                    question
                );
            }

            addAssistantMessage(
                answer
            );

            if (messageInput) {

                messageInput.value =
                    "";

                autoResizeTextarea();

                updateSendButton();
            }

            showToast(
                "Image analyzed successfully.",
                "success"
            );

        } catch (error) {

            console.error(
                "Image analysis error:",
                error
            );

            showToast(
                "Could not analyze image.",
                "error"
            );

        } finally {

            closeAttachmentMenu();

            if (imageInput) {
                imageInput.value = "";
            }
        }
    }


    /* ========================================================
       VOICE INPUT
    ======================================================== */

    function initializeSpeechRecognition() {

        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {

            recognitionSupported =
                false;

            if (micButton) {

                micButton.title =
                    "Voice input is not supported in this browser";
            }

            console.warn(
                "Speech Recognition is not supported."
            );

            return;
        }

        recognitionSupported =
            true;

        recognition =
            new SpeechRecognition();

        recognition.continuous =
            false;

        recognition.interimResults =
            true;

        recognition.lang =
            "en-US";

        recognition.maxAlternatives =
            1;


        recognition.onstart =
            function () {

                isRecording = true;

                if (micButton) {

                    micButton.classList.add(
                        "recording"
                    );

                    micButton.classList.add(
                        "active"
                    );

                    micButton.setAttribute(
                        "aria-label",
                        "Stop voice input"
                    );
                }

                if (voiceStatus) {

                    voiceStatus.textContent =
                        "Listening...";
                }

                showToast(
                    "Listening...",
                    "info"
                );
            };


        recognition.onresult =
            function (event) {

                let finalTranscript =
                    "";

                let interimTranscript =
                    "";

                for (
                    let i = event.resultIndex;
                    i < event.results.length;
                    i++
                ) {

                    const transcript =
                        event.results[i][0]
                            .transcript;

                    if (
                        event.results[i].isFinal
                    ) {

                        finalTranscript +=
                            transcript;

                    } else {

                        interimTranscript +=
                            transcript;
                    }
                }

                if (messageInput) {

                    /*
                    Keep final text.
                    */

                    if (finalTranscript) {

                        const existing =
                            messageInput.value.trim();

                        messageInput.value =
                            (
                                existing
                                    ? existing + " "
                                    : ""
                            ) +
                            finalTranscript.trim();
                    }

                    /*
                    Display interim result
                    temporarily.
                    */

                    if (interimTranscript) {

                        messageInput.dataset.interim =
                            interimTranscript;
                    } else {

                        delete messageInput
                            .dataset.interim;
                    }

                    autoResizeTextarea();

                    updateSendButton();
                }
            };


        recognition.onerror =
            function (event) {

                console.error(
                    "Speech recognition error:",
                    event.error
                );

                let message =
                    "Voice input failed.";

                switch (event.error) {

                    case "not-allowed":
                    case "permission-denied":

                        message =
                            "Microphone permission was denied. Allow microphone access in your browser.";

                        break;

                    case "no-speech":

                        message =
                            "No speech detected. Please try again.";

                        break;

                    case "audio-capture":

                        message =
                            "No microphone was found.";

                        break;

                    case "network":

                        message =
                            "Voice recognition network error.";

                        break;

                    case "aborted":

                        message =
                            "Voice input stopped.";

                        break;

                    default:

                        message =
                            "Voice input error: " +
                            event.error;
                }

                if (event.error !== "aborted") {

                    showToast(
                        message,
                        "error"
                    );
                }
            };


        recognition.onend =
            function () {

                isRecording =
                    false;

                if (micButton) {

                    micButton.classList.remove(
                        "recording"
                    );

                    micButton.classList.remove(
                        "active"
                    );

                    micButton.setAttribute(
                        "aria-label",
                        "Voice input"
                    );
                }

                if (voiceStatus) {

                    voiceStatus.textContent =
                        "";
                }

                /*
                If there is recognized text,
                update send button.
                */

                if (messageInput) {

                    delete messageInput
                        .dataset.interim;

                    autoResizeTextarea();

                    updateSendButton();
                }
            };
    }


    function startVoiceInput() {

        if (!recognitionSupported) {

            showToast(
                "Voice input is not supported in this browser. Try Chrome or Edge.",
                "warning"
            );

            return;
        }

        if (!recognition) {

            initializeSpeechRecognition();
        }

        if (!recognition) {

            showToast(
                "Voice input could not be initialized.",
                "error"
            );

            return;
        }

        try {

            if (isRecording) {

                recognition.stop();

                return;
            }

            recognition.start();

        } catch (error) {

            console.error(
                "Could not start recognition:",
                error
            );

            /*
            Recognition may throw if start()
            is called twice quickly.
            */

            if (
                error.name ===
                "InvalidStateError"
            ) {

                return;
            }

            showToast(
                "Could not start microphone.",
                "error"
            );
        }
    }


    function stopVoiceInput() {

        if (
            recognition &&
            isRecording
        ) {

            try {

                recognition.stop();

            } catch (error) {

                console.warn(
                    "Could not stop recognition:",
                    error
                );
            }
        }
    }


    /* ========================================================
       ABOUT MODAL
    ======================================================== */

    function openAboutModal() {

        if (!aboutModal) {
            return;
        }

        aboutModal.classList.add(
            "show"
        );

        aboutModal.classList.add(
            "active"
        );

        aboutModal.style.display =
            "flex";

        document.body.classList.add(
            "modal-open"
        );
    }


    function closeAboutModal() {

        if (!aboutModal) {
            return;
        }

        aboutModal.classList.remove(
            "show"
        );

        aboutModal.classList.remove(
            "active"
        );

        aboutModal.style.display =
            "";

        document.body.classList.remove(
            "modal-open"
        );
    }


    /* ========================================================
       GET ABOUT INFORMATION
    ======================================================== */

    async function loadAboutInformation() {

        try {

            const response =
                await fetch(
                    "/about",
                    {
                        method: "GET",

                        headers: {
                            "Accept":
                                "application/json"
                        },

                        credentials:
                            "same-origin"
                    }
                );

            if (!response.ok) {
                return null;
            }

            const data =
                await response.json();

            /*
            Optional elements.
            */

            const modelElements =
                getElements(
                    "#aboutModel, .about-model"
                );

            modelElements.forEach(
                function (element) {

                    if (data.model) {

                        element.textContent =
                            data.model;
                    }
                }
            );

            return data;

        } catch (error) {

            console.warn(
                "About information error:",
                error
            );

            return null;
        }
    }


    /* ========================================================
       KEYBOARD SHORTCUTS
    ======================================================== */

    function handleInputKeydown(event) {

        if (!messageInput) {
            return;
        }

        /*
        Enter sends.
        Shift + Enter creates new line.
        */

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            if (!isGenerating) {

                sendMessage();
            }
        }
    }


    /* ========================================================
       EVENT LISTENERS
    ======================================================== */

    /*
    Send
    */

    if (sendButton) {

        sendButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                if (
                    isGenerating
                ) {

                    stopGeneration();

                } else {

                    sendMessage();
                }
            }
        );
    }


    /*
    Input
    */

    if (messageInput) {

        messageInput.addEventListener(
            "input",
            function () {

                autoResizeTextarea();

                updateSendButton();
            }
        );

        messageInput.addEventListener(
            "keydown",
            handleInputKeydown
        );
    }


    /*
    New Chat
    */

    if (newChatButton) {

        newChatButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                createNewChat();
            }
        );
    }


    /*
    Clear Chat
    */

    if (clearChatButton) {

        clearChatButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                clearChat();
            }
        );
    }


    /*
    Theme
    */

    if (themeButton) {

        themeButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                toggleTheme();
            }
        );
    }


    /*
    Mobile menu
    */

    if (mobileMenuButton) {

        mobileMenuButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                toggleSidebar();
            }
        );
    }


    /*
    Overlay
    */

    if (overlay) {

        overlay.addEventListener(
            "click",
            function () {

                closeSidebar();
            }
        );
    }


    /*
    About
    */

    if (aboutButton) {

        aboutButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                openAboutModal();

                loadAboutInformation();
            }
        );
    }


    /*
    About close
    */

    if (aboutCloseButton) {

        aboutCloseButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                closeAboutModal();
            }
        );
    }


    /*
    Close modal when clicking background.
    */

    if (aboutModal) {

        aboutModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    aboutModal
                ) {

                    closeAboutModal();
                }
            }
        );
    }


    /*
    Microphone
    */

    if (micButton) {

        micButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                startVoiceInput();
            }
        );
    }


    /*
    Attachment
    */

    if (attachmentButton) {

        attachmentButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();

                toggleAttachmentMenu();
            }
        );
    }


    /*
    Document upload button
    */

    if (documentButton) {

        documentButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                if (documentInput) {

                    documentInput.click();
                }
            }
        );
    }


    /*
    Document input
    */

    if (documentInput) {

        documentInput.addEventListener(
            "change",
            function () {

                const file =
                    documentInput.files &&
                    documentInput.files[0];

                if (file) {

                    uploadDocument(
                        file
                    );
                }
            }
        );
    }


    /*
    Image upload button
    */

    if (imageButton) {

        imageButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                if (imageInput) {

                    imageInput.click();
                }
            }
        );
    }


    /*
    Image input
    */

    if (imageInput) {

        imageInput.addEventListener(
            "change",
            function () {

                const file =
                    imageInput.files &&
                    imageInput.files[0];

                if (file) {

                    analyzeImage(
                        file
                    );
                }
            }
        );
    }


    /*
    Close attachment menu
    */

    document.addEventListener(
        "click",
        function (event) {

            if (!attachmentMenu) {
                return;
            }

            if (
                !attachmentMenu.contains(
                    event.target
                ) &&
                !(
                    attachmentButton &&
                    attachmentButton.contains(
                        event.target
                    )
                )
            ) {

                closeAttachmentMenu();
            }
        }
    );


    /*
    Escape key
    */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Escape"
            ) {

                closeSidebar();

                closeAboutModal();

                closeAttachmentMenu();

                if (isRecording) {

                    stopVoiceInput();
                }
            }
        }
    );


    /*
    Window resize
    */

    window.addEventListener(
        "resize",
        function () {

            if (
                window.innerWidth > 768
            ) {

                closeSidebar();
            }
        }
    );


    /*
    Page visibility
    */

    document.addEventListener(
        "visibilitychange",
        function () {

            if (
                document.hidden &&
                isRecording
            ) {

                stopVoiceInput();
            }
        }
    );


    /* ========================================================
       DRAG AND DROP
    ======================================================== */

    if (chatArea) {

        chatArea.addEventListener(
            "dragover",
            function (event) {

                event.preventDefault();

                chatArea.classList.add(
                    "drag-over"
                );
            }
        );


        chatArea.addEventListener(
            "dragleave",
            function () {

                chatArea.classList.remove(
                    "drag-over"
                );
            }
        );


        chatArea.addEventListener(
            "drop",
            function (event) {

                event.preventDefault();

                chatArea.classList.remove(
                    "drag-over"
                );

                const files =
                    Array.from(
                        event.dataTransfer.files
                    );

                if (
                    files.length === 0
                ) {
                    return;
                }

                const file =
                    files[0];

                if (
                    file.type.startsWith(
                        "image/"
                    )
                ) {

                    analyzeImage(
                        file
                    );

                } else {

                    uploadDocument(
                        file
                    );
                }
            }
        );
    }


    /* ========================================================
       INITIALIZATION
    ======================================================== */

    function initialize() {

        console.log(
            "Initializing AI Assistant..."
        );

        /*
        Theme
        */

        initializeTheme();

        /*
        Voice
        */

        initializeSpeechRecognition();

        /*
        Buttons
        */

        setupFeatureButtons();

        setupQuickButtons();

        /*
        Input
        */

        autoResizeTextarea();

        updateSendButton();

        /*
        Initial welcome screen
        */

        if (
            messagesContainer &&
            messagesContainer.children.length === 0
        ) {

            showWelcome();
        }

        /*
        Check Flask/Ollama.
        */

        checkConnection(
            false
        );

        /*
        Load history.
        */

        loadHistory();

        /*
        Document status.
        */

        loadDocumentStatus();

        /*
        Focus input.
        */

        if (messageInput) {

            setTimeout(
                function () {

                    messageInput.focus();

                },
                300
            );
        }

        console.log(
            "AI Assistant initialized."
        );
    }


    /* ========================================================
       DOCUMENT STATUS
    ======================================================== */

    async function loadDocumentStatus() {

        try {

            const response =
                await fetch(
                    "/document-status",
                    {
                        method: "GET",

                        headers: {
                            "Accept":
                                "application/json"
                        },

                        credentials:
                            "same-origin"
                    }
                );

            if (!response.ok) {
                return;
            }

            const data =
                await response.json();

            if (
                data.has_document
            ) {

                attachedDocument =
                    data.filename || null;

                console.log(
                    "Document loaded:",
                    attachedDocument
                );
            }

        } catch (error) {

            console.warn(
                "Document status error:",
                error
            );
        }
    }


    /* ========================================================
       PERIODIC HEALTH CHECK
    ======================================================== */

    setInterval(
        function () {

            checkConnection(
                false
            );

        },
        30000
    );


    /* ========================================================
       START APPLICATION
    ======================================================== */

    initialize();


    /* ========================================================
       GLOBAL DEBUG ACCESS
    ======================================================== */

    window.AIAssistant = {

        sendMessage:
            sendMessage,

        newChat:
            createNewChat,

        clearChat:
            clearChat,

        toggleTheme:
            toggleTheme,

        checkConnection:
            checkConnection,

        startVoice:
            startVoiceInput,

        stopVoice:
            stopVoiceInput,

        uploadDocument:
            uploadDocument,

        analyzeImage:
            analyzeImage,

        removeDocument:
            removeDocument
    };

});