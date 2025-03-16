
// gemini.js
const google = require("@google/generative-ai");
const { getAndSetProxyEnvironment } = require("./sys_proxy");
const fs = require("fs");
const path = require("path");

// Get proxy settings and set environment variables
const proxySettings = getAndSetProxyEnvironment();

async function gemini_generate_stream(settings, imagePath, callback) {
    const genAI = new google.GoogleGenerativeAI(settings.apiKey);
    const model = genAI.getGenerativeModel(
        { model: settings.apiModel }
    );

    const prompt = settings.apiPrompt;
    const imageBase64 = Buffer.from(fs.readFileSync(imagePath)).toString("base64");
    const image = {
        inlineData: {
            data: imageBase64,
            mimeType: "image/png",
        },
    };

    const result = await model.generateContentStream({
        contents: [{
            role: "user",
            parts: [
                { text: prompt },
                image
            ]
        }],
        systemInstruction: settings.apiSysPrompt
    });
    
    for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        const data = {
            text: chunkText,
            end: false
        };
        callback(data);
    }
    callback({text:"", end:true});
}

module.exports = {
    gemini_generate_stream
};
