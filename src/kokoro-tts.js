
const fs = require('fs');
const path = require('path');

async function kokoro_generate_speech(settings, text) {    
    const body = {
        "Text": text,
        "VoiceId": settings.spkModel,
        "Bitrate": "48k",
        'Codec': 'libmp3lame',
        "Pitch": 1,
        "Speed": settings.spkRate - 1.0
    }
    const bodyStr = JSON.stringify(body);
    try {
        const response = await fetch(settings.spkEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.spkKey}`,
                'Content-Type': 'application/json'
            },
            body: bodyStr
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        // Get binary data
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Save to file
        const filePath = path.join(__dirname, '../output.mp3');
        fs.writeFileSync(filePath, buffer);
        //console.log('MP3 file saved successfully! :', filePath);
        return filePath;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

module.exports = {
    kokoro_generate_speech
}