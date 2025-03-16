const openai = require('openai');
const { getAndSetProxyEnvironment } = require("./sys_proxy");
const fs = require("fs");
const path = require("path");

/**
 * Converts an image file to base64 format
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} - Promise resolving to base64 encoded image
 */
function imageToBase64(imagePath) {
    try {
        // Read the image file
        const imageBuffer = fs.readFileSync(imagePath);

        // Convert buffer to base64 string
        const base64Image = imageBuffer.toString('base64');

        // You can add the data URI prefix if needed
        // return `data:image/jpeg;base64,${base64Image}`;

        return base64Image;
    } catch (error) {
        console.error('Error converting image to base64:', error);
        throw error;
    }
}

function imageToBase64_dync(imagePath, callback) {
    fs.readFile(imagePath, (err, imageBuffer) => {
        if (err) {
            return callback(err);
        }
        const base64Image = imageBuffer.toString('base64');
        callback(null, base64Image);
    });
}

// First set the proxy
const proxySettings = getAndSetProxyEnvironment();

async function openai_generate_stream(settings, imagePath, callback) {
    const openchat = new openai.OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.apiEndpoint
    });
    const prompt = settings.apiPrompt;
    const sys_prompt = settings.apiSysPrompt;
    const imageBase64 = imageToBase64(imagePath);
    const stream = await openchat.chat.completions.create({
        model: settings.apiModel,
        messages: [
            { role: "system", content: sys_prompt },
            {
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    {
                        type: "image_url",
                        image_url: {
                            "url": `data:image/png;base64,${imageBase64}`,
                        },
                    }
                ],
            },
        ],
        stream: true,
        temperature: settings.apiTemperature
    });

    for await (const chunk of stream) {
        const data = {
            text: chunk.choices[0]?.delta?.content || '',
            end: false
        };
        callback(data);
    }
    callback({text:"", end:true});
}

module.exports = {
    openai_generate_stream
};
