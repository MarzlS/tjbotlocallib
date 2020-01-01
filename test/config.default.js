// Create the credentials object for export
exports.credentials = {};

// Watson Speech to Text
// https://www.ibm.com/watson/developercloud/speech-to-text.html
exports.credentials.speech_to_text = {
    apikey: '',
    url: 'https://stream.watsonplatform.net/speech-to-text/api/'
};

// set up TJBot's configuration
exports.tjConfig = {
    log: {
        level: 'silly'
    },
    speak: {
        speakerDeviceId: 'plughw:1,0'
    }    
};
