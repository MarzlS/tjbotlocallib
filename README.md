# TJBot-Local Library

> Node.js library for using TJBot with Pocketsphinx for local keyword detection

This library wraps the original TJBot library and allows to use Pocketsphinx for local keyword detection so that data is only send to the IBM Watson cloud services AFTER the keyword has been detected in the audio stream.

The original TJBot library that is wrapped by this module can be found here: https://github.com/ibmtjbot/tjbotlib

# Usage

Install the library as follows.

```
$ npm install --save MarzlS/tjbotlocallib
```

> Note: The TJBot and TJBot-Local library was developed for use on Raspberry Pi. It may be possible to develop and test portions of this library on other Linux-based systems (e.g. Ubuntu), but this usage is not officially supported.

Instantiate a `TJBotLocal` object instead of the `TJBot` object.

```
const TJBotLocal = require('tjbotlocal');

...

var tj = new TJBotLocal(hardware, configuration, credentials);

```

All other method calls to the `tj` object can stay the same as with the original TJBot library.

# TJBot API

All public methods of the original TJBot library are supported.

If you need access to the wrapped TJBot instance itself you can access it as follows:

```
var tj = new TJBotLocal(hardware, configuration, credentials);
tj.getTJBot(); // the wrapped TJBot instance
```

If you need low-level access to the Watson APIs beyond the level provided by `TJBot`, you can access them as follows:

```
var tj = new TJBotLocal(hardware, configuration, credentials);
tj.getTJBot()._assistant; // the AssistantV1 service object
tj.getTJBot()._languageTranslator; // the LanguageTranslatorV3 service object
tj.getTJBot()._stt; // the SpeechToTextV1 service object
tj.getTJBot()._tts; // the TextToSpeechV1 service object
tj.getTJBot()._toneAnalyzer; // the ToneAnalyzerV3 service object
tj.getTJBot()._visualRecognition; // the VisualRecognitionV3 service object
```

# Contributing
I encourage you to make enhancements to this library and contribute them back to me via a pull request.

# License
This project uses the [Apache License Version 2.0](LICENSE) software license.



