
const sound = require("sound-play");

async function playAudio(filePath) {
    try {
        /**
         * 0   = silent
         * 0.5 = default
         * 1   = max volume
         */
        const volume = 0.5;        
        //await sound.play(filePath, volume);
        sound.play(filePath, volume).then((response) => {
            //console.log("done")
        });
    } catch (error) {
        console.error('Error playing audio:', error);
    }
}

module.exports = {
    playAudio
};