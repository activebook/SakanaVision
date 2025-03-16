const WebSocket = require('ws');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

let wsUrl = null;
let apiKey = null;
let rate = 1;
let model = null;
let filePath = null;

/**
 * Creates an audio file using text-to-speech API
 * @param {string} outputFilePath - Path to save the audio file
 * @param {string} text - Text to convert to speech
 * @param {object} options - Optional TTS parameters
 * @returns {Promise<void>}
 */
async function sambert_generate_speech(settings, text, options = {}) {
    filePath = path.join(__dirname, "../output.mp3");
    await prepareOutputFile(filePath);

    apiKey = settings.spkKey;
    wsUrl = settings.spkEndpoint;
    rate = settings.spkRate;
    model = settings.spkModel;

    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(filePath, { flags: 'a' });
        const ws = createWebSocketConnection(fileStream, text, options, { resolve, reject });

        // Handle stream errors
        fileStream.on('error', (err) => {
            ws.close();
            reject(err);
        });
    });
}

function prepareOutputFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.access(filePath, fs.F_OK, (err) => {
            if (!err) {
                // File exists, truncate it
                fs.truncate(filePath, 0, (truncateErr) => {
                    if (truncateErr) return reject(truncateErr);
                    resolve();
                });
            } else {
                // File doesn't exist, create it
                fs.open(filePath, 'w', (openErr, fd) => {
                    if (openErr) return reject(openErr);
                    fs.close(fd, (closeErr) => {
                        if (closeErr) return reject(closeErr);
                        resolve();
                    });
                });
            }
        });
    });
}

function createWebSocketConnection(fileStream, text, userOptions, { resolve, reject }) {
    const ws = new WebSocket(wsUrl, {
        headers: {
            Authorization: `bearer ${apiKey}`,
            'X-DashScope-DataInspection': 'enable'
        }
    });

    ws.on('open', () => sendRunTaskMessage(ws, text, userOptions));

    ws.on('message', (data, isBinary) => {
        if (isBinary) {
            fileStream.write(data);
        } else {
            const message = JSON.parse(data);
            handleWebSocketEvent(message, ws, fileStream, { resolve, reject });
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket Error', error);
        fileStream.end();
        reject(error);
    });

    ws.on('close', () => {
        //console.log('WebSocket Closed');
    });

    return ws;
}

function sendRunTaskMessage(ws, text, userOptions) {
    const taskId = uuidv4();
    const defaultParameters = {
        text_type: 'PlainText',
        format: 'mp3',
        sample_rate: 16000,
        volume: 50,
        rate: rate,
        pitch: 1,
        word_timestamp_enabled: true,
        phoneme_timestamp_enabled: true
    };

    const runTaskMessage = {
        header: {
            action: 'run-task',
            task_id: taskId,
            streaming: 'out'
        },
        payload: {
            model: model,
            task_group: 'audio',
            task: 'tts',
            function: 'SpeechSynthesizer',
            input: {
                text: text
            },
            parameters: { ...defaultParameters, ...userOptions }
        }
    };

    ws.send(JSON.stringify(runTaskMessage));
}

function handleWebSocketEvent(message, ws, fileStream, { resolve, reject }) {
    switch (message.header.event) {
        case 'task-started':
            //console.log('TTS task started');
            break;
        case 'result-generated':
            //console.log('TTS result generated');
            break;
        case 'task-finished':
            ws.close();
            fileStream.end(() => {
                //console.log('TTS task completed successfully');
                resolve(filePath);
            });
            break;
        case 'task-failed':
            console.error('TTS task failed:', message.header.error_message);
            ws.close();
            fileStream.end(() => {
                reject(new Error(message.header.error_message));
            });
            break;
        default:
            //console.log(`Unknown event: ${message.header.event}`);
    }
}



// Export functions (consistent with the export declaration above)
module.exports = {
    sambert_generate_speech
};