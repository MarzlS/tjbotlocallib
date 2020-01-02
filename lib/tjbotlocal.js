/**
 * Copyright 2020 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

// the original TJBot module
const TJBot = require('tjbot');

// used node modules
const assert = require('assert');
const winston = require('winston');

// hardware modules
const Mic = require('mic');


/**
 * TJBotLocal
 * @param {String} hardware The set of hardware with which TJBot is equipped (see TJBot.prototype.hardware).
 * @param {Object} configuration Configuration parameters
 * @param {Object} credentials The set of service credentials needed for external services (see TJBot.prototype.services).
 * @constructor
 */
function TJBotLocal(hardware, configuration, credentials) {

    if (!(this instanceof TJBotLocal)) {
        throw new Error('"new" keyword required to create TJBotLocal service instances');
    }

    this._tjbot = new TJBot(hardware, configuration, credentials);

    // import configuration params
    this.configuration = Object.assign({}, TJBotLocal.prototype.defaultConfiguration, configuration);

    // set logging level
    winston.level = this.configuration.log.level;

    this._hasLED = (this._tjbot._led != undefined);

    this._listenGracePeriodTimeout = -1;

    hardware.forEach(function(device) {
        switch (device) {

        case 'microphone':
            this._setupMicrophone();
            this._setupLocalListening();
            break;

        case 'speaker':
            this._setupLocalSpeaking();
            break;

        }
    }, this);

    winston.info('TJBot is listening for keywords locally without cloud access.');
    winston.verbose('TJBot-Local library version ' + TJBotLocal.prototype.version);

    winston.silly('TJBot-Local configuration:');
    winston.silly(this.configuration);
    
};

/**
 * TJBotLocal module version
 */
TJBotLocal.prototype.version = 'v1.0.0';

/**
 * List of TJBotLocal status.
 */
TJBotLocal.prototype.status =  ['listening4keyword', 'listening4audio', 'speaking'];

/**
 * Default configuration parameters.
 */
TJBotLocal.prototype.defaultConfiguration = {
    log: {
        level: 'info' // valid levels are 'error', 'warn', 'info', 'verbose', 'debug', 'silly'
    },
    robot: {
        name: 'Watson'
    },
    listen: {
        microphoneDeviceId: 'plughw:1,0', // plugged-in USB card 1, device 0; see `arecord -l` for a list of recording devices
        inactivityTimeout: -1, // -1 to never timeout or break the connection. Set this to a value in seconds e.g 120 to end connection after 120 seconds of silence
        language: 'en-US' // see TJBot.prototype.languages.listen
    },
    locallisten: {
        enabled: true,
        colorLocalListen: 'off', // color used when in local listen mode
        colorRemoteListen: 'blue', // color used when in remote listen mode
        gracePeriod: -1, // seconds we keep remote communication without need to use the keyword, -1 for no grace period
        acousticModel: '/usr/local/share/pocketsphinx/model/en-us/en-us', // acoustic model files
        dictionary: './resources/ps/tjbot.dic', // pronounciation dictionary input file
        languageModel: './resources/ps/tjbot.lm', // trigram language model input file
        engine: 'pocketsphinx' // for future use, currently only pocketsphinx supported
    },
    speak: {
        speakerDeviceId: 'plughw:0,0' // plugged-in USB card 1, device 0; `see aplay -l` for a list of playback devices
    },
    localspeak: {
        enabled: true,
        audioPresynthesized: './audio/synthesized', // folder containing the pre-synthesized audio files
        useAudioCache: true,
        audioCache: './audio/cache' // folder containing the cached synthesized audio files
    }
};

// List of all available configuration parameters
TJBotLocal.prototype.configurationParameters = Object.keys(TJBotLocal.prototype.defaultConfiguration);

// List of all available languages
TJBotLocal.prototype.languages = {};
TJBotLocal.prototype.languages.listen = ['en-US'];
TJBotLocal.prototype.languages.speak = TJBot.prototype.languages.speak;


/** ------------------------------------------------------------------------ */
/** INTERNAL HARDWARE INITIALIZATION                                         */
/** ------------------------------------------------------------------------ */

/**
 * Configure the microphone for speech recognition.
 */
TJBotLocal.prototype._setupMicrophone = function() {

    winston.verbose('TJBot-Local initializing microphone');
   
    // create the microphone
    this._tjbot._setupMicrophone();
    this._mic = this._tjbot._mic;
  
    // (re-)create the mic audio stream
    this._micInputStream = this._tjbot._micInputStream;

};

/**
 * Configure local listening.
 *
 * @param {Int} pin The pin number to which the servo is connected.
 */
TJBotLocal.prototype._setupLocalListening = function(configuration) {

    var ps = require('pocketsphinx').ps;

    var psConfig = new ps.Decoder.defaultConfig();
    psConfig.setString("-hmm", this.configuration.locallisten.acousticModel);
    psConfig.setString("-dict", this.configuration.locallisten.dictionary);
    psConfig.setString("-lm", this.configuration.locallisten.languageModel);
    psConfig.setInt("-samprate", 16000);

    winston.verbose('TJBot-Local initializing engine ' + this.configuration.locallisten.engine);

    this._decoder = new ps.Decoder(psConfig);

};

/**
 * Configure the speaker.
 */
TJBotLocal.prototype._setupLocalSpeaking = function() {
    this._soundplayer = this._tjbot._soundplayer;
};

/**
 * Assert that TJBotLocal is able to perform a specified capability.
 *
 * @param {String} capability The capability assert (see TJBot.prototype.capabilities).
 */
TJBotLocal.prototype._assertCapability = function(capability) {

    this._tjbot._assertCapability(capability);
    
    switch (capability) {
    case 'listen':
        
        if (!this._decoder) {
            throw new Error(
                'TJBot-Local is not configured to listen. ' +
                    'Please check that you included credentials for Pocketsphinx in the TJBotLocal constructor.');
        }
        break;

    case 'speak':
        break;
    }
};

/** ------------------------------------------------------------------------ */
/** UTILITY METHODS                                                          */
/** ------------------------------------------------------------------------ */

/**
 * Get the underlying original TJBot instance.
 */
TJBotLocal.prototype.getTJBot = function() {
    return this._tjbot;
};

/**
 * Put TJBot to sleep.
 *
 * @param {Int} msec Number of milliseconds to sleep for (1000 msec == 1 sec).
 */
TJBotLocal.prototype.sleep = function(msec) {
    this._tjbot.sleep(msec);
};

/** ------------------------------------------------------------------------ */
/** ANALYZE TONE                                                             */
/** ------------------------------------------------------------------------ */

/**
 * Analyze the tone of the given text.
 *
 * @param {String} text The text to analyze.
 */
TJBotLocal.prototype.analyzeTone = function(text) {
    return this._tjbot.analyzeTone(text);
};

/** ------------------------------------------------------------------------ */
/** CONVERSE                                                                 */
/** ------------------------------------------------------------------------ */

/**
 * Take a conversational turn in the given Watson conversation.
 *
 * @param {String} workspaceId The id of the workspace to use in the Assistant service.
 * @param {String} message The message to send to the Assistant service.
 * 
 * Returns a conversation response object.
 *
 */
TJBotLocal.prototype.converse = function(workspaceId, message, callback) {
    this._tjbot.converse(workspaceId, message, callback);
};


/** ------------------------------------------------------------------------ */
/** LISTEN                                                                   */
/** ------------------------------------------------------------------------ */

/**
 * Listen for spoken utterances.
 */
TJBotLocal.prototype.listen = function(callback) {

    if (this.configuration.locallisten.enabled) {

        // make sure we can listen
        this._assertCapability('listen');
 
        //turn the LED to local color
        if (this._hasLED) {
            this._tjbot.shine(this.configuration.locallisten.colorLocalListen);
        }   
 
        // capture 'this' context
        var self = this;
        
        // keyword to look for
        var keyword = this.configuration.robot.name.toUpperCase();

        // (re)initialize the microphone because if stopListening() was called, we don't seem to
        // be able to re-use the microphone twice
        this._setupMicrophone();

        this._micInputStream.on('startComplete', function() {
            winston.debug('Starting utterance on local decoder');
            self._decoder.startUtt();
        });

        this._micInputStream.on('processExitComplete', function() {
            winston.debug('Ending utterance on local decoder');
            self._decoder.endUtt();
        });

        this._micInputStream.on('silence', function() {
            winston.debug('New utterance on local decoder');
            self._decoder.endUtt();
            self._decoder.startUtt();
        });

        this._micInputStream.on('data', function(data) {
            if(data.length > 0) {
                self._decoder.processRaw(data, false, false);
                if (self._decoder.hyp()) {
                    //winston.silly(self._decoder.hyp());
                    
                    var hypothesis = self._decoder.hyp()["hypstr"];
                    winston.debug("Local: " + hypothesis);
                    
                    if (hypothesis.includes(keyword)) {
                    
                        //turn the LED to remote color
                        if (self._hasLED) {
                            self._tjbot.shine(self.configuration.locallisten.colorRemoteListen);
                        }  
                         
                        self._mic.stop();
                        self._tjbot.listen(callback);
                        
                    }
                }
            }
        });

        winston.debug("Starting microphone for local listening");  
        
        this._mic.start();
       
    } else {
        this._tjbot.listen(callback);
    }

};

/**
 * Pause listening for spoken utterances
 */
TJBotLocal.prototype.pauseListening = function() {

    if (this.configuration.locallisten.enabled) {

        // make sure we can listen
        this._assertCapability('listen');
    
        //TODO: Implement
        this._tjbot.pauseListening();
       
    } else {
        this._tjbot.pauseListening();
    }
    
};

/**
 * Resume listening for spoken utterances
 */
TJBotLocal.prototype.resumeListening = function() {

    if (this.configuration.locallisten.enabled) {

        // make sure we can listen
        this._assertCapability('listen');
    
        //TODO: Implement
        this._tjbot.resumeListening();
       
    } else {
        this._tjbot.resumeListening();
    }
    
};

/**
 * Stop listening for spoken utterances
 */
TJBotLocal.prototype.stopListening = function() {

    if (this.configuration.locallisten.enabled) {

        // make sure we can listen
        this._assertCapability('listen');
    
        //TODO: Implement
        this._tjbot.stopListening();
       
    } else {
        this._tjbot.stopListening();
    }
    
};

/** ------------------------------------------------------------------------ */
/** SEE                                                                      */
/** ------------------------------------------------------------------------ */

/**
 * Take a picture and identify the objects present.
 *
 * Returns a list of objects seen and their confidences.
 * See VisualRecognitionV3.prototype.classify for more detail on the
 * return object.
 */
TJBotLocal.prototype.see = function(classifier_ids = []) {
    return this._tjbot.see(classifier_ids);
};

/**
 * Describe photo by sending it to the Watson Visual Recognition Service.
 */
TJBotLocal.prototype.recognizeObjectsInPhoto = function(filePath, classifier_ids) {
    return this._tjbot.recognizeObjectsInPhoto(filePath, classifier_ids);
};

/**
 * Take a picture and read the identified text.
 *
 * Returns a list of text strings identified and their locations in the image.
 * See VisualRecognitionV3.prototype.recognizeText for more detail on the
 * return object.
 */
TJBotLocal.prototype.read = function() {
    return this._tjbot.read();
};

/**
 * Recognize text in photo by sending it to the Watson Visual Recognition Service.
 */
TJBotLocal.prototype.recognizeTextInPhoto = function(filePath) {
    return this._tjbot.recognizeTextInPhoto(filePath);
};

/**
 * Capture an image and save it in the given path. If no path is provided, 
 * it saves this file to a temp location.
 *
 * @param {String} filePath The path at which to save the image.
 *
 * Returns the photo data in a Buffer.
 */
TJBotLocal.prototype.takePhoto = function(filePath) {
    return this._tjbot.takePhoto(filePath);
};

/** ------------------------------------------------------------------------ */
/** SHINE                                                                    */
/** ------------------------------------------------------------------------ */

/**
 * Change the color of the LED.
 *
 * @param {String} color The color to use. Must be interpretable by TJBot.prototype._normalizeColor.
 */
TJBotLocal.prototype.shine = function(color) {
    this._tjbot.shine(color);
};

/**
 * Pulse the LED a single time.
 * @param {String} color The color to pulse the LED.
 * @param {Integer} duration The duration the pulse should last (default = 1 second, should be between 0.5 and 3 seconds)
 */
TJBotLocal.prototype.pulse = function(color, duration = 1.0) {
    this._tjbot.pulse(color, duration);
};

/**
 * Get the list of colors recognized by TJBot.
 */
TJBotLocal.prototype.shineColors = function() {
    return this._tjbot.shineColors();
};

/**
 * Get a random color.
 */
TJBotLocal.prototype.randomColor = function() {
    return this._tjbot.randomColor();
};

/** ------------------------------------------------------------------------ */
/** SPEAK                                                                    */
/** ------------------------------------------------------------------------ */

/**
 * Speak the given message.
 *
 * @param {String} message The message to speak.
 */
TJBotLocal.prototype.speak = function(message) {

    if (this.configuration.localspeak.enabled) {

        // make sure we can listen
        this._assertCapability('listen');
    
        //TODO: Implement
        return this._tjbot.speak(message);
       
    } else {
        return this._tjbot.speak(message);
    }

};

/**
 * Play a given sound file.
 *
 * @param {String} soundFile The sound file to be played .
 */
TJBotLocal.prototype.play = function(soundFile) {
    return this._tjbot.play(soundFile);
};

/** ------------------------------------------------------------------------ */
/** TRANSLATE                                                                */
/** ------------------------------------------------------------------------ */

/**
 * Translates the given text from the source language to the target language.
 *
 * @param {String} text The text to translate.
 * @param {String} sourceLanguage The source language (e.g. "en" for English)
 * @param {String} targetLanguage The target language (e.g. "es" for Spanish)
 */
TJBotLocal.prototype.translate = function(text, sourceLanguage, targetLanguage) {
    return this._tjbot.translate(text, sourceLanguage, targetLanguage);
};

/**
 * Identifies the language of the given text.
 *
 * @param {String} text The text to identify.
 *
 * Returns a list of identified languages in the text.
 */
TJBotLocal.prototype.identifyLanguage = function(text) {
    return this._tjbot.identifyLanguage(text);
};

/**
 * Determines if TJBot can translate from the source language to the target language.
 *
 * @param {String} sourceLanguage The source language (e.g. "en" for English)
 * @param {String} targetLanguage The target language (e.g. "es" for Spanish)
 *
 * Returns a Promise that resolves to whether the sourceLanguage can be translated
 * to the targetLanguage.
 */
TJBotLocal.prototype.isTranslatable = function(sourceLanguage, targetLanguage) {
    return this._tjbot.isTranslatable(sourceLanguage, targetLanguage);
};

/** ------------------------------------------------------------------------ */
/** WAVE                                                                     */
/** ------------------------------------------------------------------------ */

/**
 * Move TJ's arm all the way back.
 */
TJBotLocal.prototype.armBack = function() {
    this._tjbot.armBack();
};

/**
 * Raise TJ's arm.
 */
TJBotLocal.prototype.raiseArm = function() {
    this._tjbot.raiseArm();
};

/**
 * Lower TJ's arm.
 */
TJBotLocal.prototype.lowerArm = function() {
    this._tjbot.lowerArm();
};

/**
 * Wave TJ's arm.
 */
TJBotLocal.prototype.wave = function() {
    return this._tjbot.wave();
};

/** ------------------------------------------------------------------------ */
/** MODULE EXPORTS                                                           */
/** ------------------------------------------------------------------------ */

/**
 * Export TJBotLocal
 */
module.exports = TJBotLocal;
