const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatbox = document.querySelector(".chatbox");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector("#send-btn");  // Use correct ID here
const fileInput = document.querySelector("#file-input");
const fileUploadButton = document.querySelector("#file-upload");
const filePreviewDiv = document.querySelector("#file-preview");
const removeFileButton = document.querySelector("#remove-file");

let userMessage = null;
let imageBase64 = null;
let pdfText = null;

const API_KEY = " "; // Add your API_KEY
const inputInitHeight = chatInput.scrollHeight;

const createChatLi = (message, className) => {
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", `${className}`);
    let chatContent = className === "outgoing"
        ? `<p></p>`
        : `<span class="material-symbols-outlined">smart_toy</span><p></p>`;
    chatLi.innerHTML = chatContent;
    chatLi.querySelector("p").textContent = message;
    return chatLi;
}

const generateResponse = (chatElement) => {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    const messageElement = chatElement.querySelector("p");

    const requestBody = {
        contents: [{
            parts: [
                { text: userMessage },
                imageBase64 ? {
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: imageBase64
                    }
                } : null,
                pdfText ? { text: pdfText } : null
            ].filter(Boolean)
        }]
    };

    const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    };

    fetch(API_URL, requestOptions)
        .then(res => res.json())
        .then(data => {
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error("No response from the API.");
            }
            messageElement.textContent = data.candidates[0].content.parts[0].text.trim();
        })
        .catch((error) => {
            messageElement.classList.add("error");
            messageElement.textContent = "Oops! Something went wrong. Please try again.";
            console.error(error);
        })
        .finally(() => chatbox.scrollTo(0, chatbox.scrollHeight));
}

const handleChat = () => {
    userMessage = chatInput.value.trim();
    if (!userMessage && !imageBase64 && !pdfText) return;

    chatInput.value = "";
    chatInput.style.height = `${inputInitHeight}px`;

    chatbox.appendChild(createChatLi(userMessage, "outgoing"));
    chatbox.scrollTo(0, chatbox.scrollHeight);

    setTimeout(() => {
        const incomingChatLi = createChatLi("Thinking...", "incoming");
        chatbox.appendChild(incomingChatLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
        generateResponse(incomingChatLi);
    }, 600);
}

chatInput.addEventListener("input", () => {
    chatInput.style.height = `${inputInitHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});

chatInput.addEventListener("keydown", (e) => {
    // Ensure Enter key sends the message when not pressing Shift
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
        e.preventDefault();
        handleChat();
    }
});

// Use the correct send button
sendChatBtn.addEventListener("click", handleChat);

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];

    if (file) {
        const fileType = file.type;

        fileUploadButton.style.display = 'none';
        filePreviewDiv.style.display = 'block';

        if (fileType.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';

                imageBase64 = e.target.result.split(',')[1];

                filePreviewDiv.innerHTML = '';
                filePreviewDiv.appendChild(img);
                filePreviewDiv.appendChild(removeFileButton);
            };
            reader.readAsDataURL(file);
        } else if (fileType === 'application/pdf') {
            pdfText = '';
            filePreviewDiv.innerHTML = '';
            filePreviewDiv.innerHTML = `<span class="material-symbols-outlined">picture_as_pdf</span>`;
            filePreviewDiv.innerHTML += `<a href="${URL.createObjectURL(file)}" target="_blank">View PDF</a>`;
            filePreviewDiv.appendChild(removeFileButton);

            const reader = new FileReader();
            reader.onload = function() {
                const typedarray = new Uint8Array(reader.result);
                pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                    const numPages = pdf.numPages;
                    let pagesText = [];

                    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                        pdf.getPage(pageNum).then(page => {
                            page.getTextContent().then(textContent => {
                                const text = textContent.items.map(item => item.str).join(" ");
                                pagesText.push(text);
                                pdfText = pagesText.join(" ");
                            });
                        });
                    }
                });
            };
            reader.readAsArrayBuffer(file);
        } else {
            filePreviewDiv.innerHTML = "Unsupported file type.";
            filePreviewDiv.appendChild(removeFileButton);
        }
    }
});

removeFileButton.addEventListener('click', () => {
    filePreviewDiv.style.display = 'none';
    fileInput.value = '';
    fileUploadButton.style.display = 'block';
    imageBase64 = null;
    pdfText = null;
});

closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
