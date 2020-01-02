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

# Prerequisites

## Install Pocketsphinx

### Install required libraries

```
sudo apt-get update && sudo apt-get upgrade
sudo apt-get install bison python-dev swig libasound2-dev -y
```

### Download the CMU Sphinx bundle files

```
cd ~/Downloads
wget http://sourceforge.net/projects/cmusphinx/files/sphinxbase/5prealpha/sphinxbase-5prealpha.tar.gz
wget https://sourceforge.net/projects/cmusphinx/files/pocketsphinx/5prealpha/pocketsphinx-5prealpha.tar.gz
sudo rm -r sphinxbase-5prealpha
tar -zxvf ./sphinxbase-5prealpha.tar.gz
sudo rm -r pocketsphinx-5prealpha
tar -zxvf ./pocketsphinx-5prealpha.tar.gz
```

### Compile sphinxbase

```
cd ./sphinxbase-5prealpha
./configure --enable-fixed && sudo make && sudo make install
```

### Compile pocketsphinx

```
cd ../pocketsphinx-5prealpha
./configure && sudo make && sudo make install
```

### Export Library Path

```
export LD_LIBRARY_PATH=/usr/local/lib 
export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig
```

> Add export statements to ~/.bashrc to make them persistent.

### First simple test

I use `-adcdev plughw:1,0` because my Raspi uses a USB sound card for the microfone.

```
pocketsphinx_continuous -adcdev plughw:1,0  -inmic yes
```


## Install Pocketsphinx Node JS Module

### Update Node version

Check the Node Version, it must be 7.6 or later.

```
node --version
```

I installed Node version 8.17.0 as there is a problem with the libstdc++.so.6 required for later versions of Node on Raspberry Jessie operating system.
You can use "n" to install a specific Node JS version:

```
sudo npm install -g npm
sudo npm install -g n
sudo n 8.17.0
sudo rm -rf ~/.npm
```

### Install SWIG 4.x

The SWIG version must be 4.x or later as this fixes a bug with Node v8::WeakCallbackData that has been removed from Node JS version 8 and later.

Check SWIG version:
```
swig -version
```

Install version 4.0.1:

```
cd ~/Downloads
sudo apt-get install libpcre3 libpcre3-dev
wget https://sourceforge.net/projects/swig/files/swig/swig-4.0.1/swig-4.0.1.tar.gz
tar xzf swig-4.0.1.tar.gz
cd swig-4.0.1
./configure
make
sudo make install
```

If SWIG 2 was installed previously, remove it:

```
sudo rm -rf /usr/bin/swig2.0
```

### Install cmake and cmake-js

The Node JS module is using CMake for the build so we need to install it first.
Due to Node JS version 8.x we need cmake-js version 5.x, not the latest 6.x version.

```
sudo apt-get install cmake
sudo npm install -g cmake-js@^5.0.0
```

### Install pocketsphinx node modules (optional)

This is done automatically if you do the `npm install` call mentioned above. 
To manually install just the pocketsphix module use:

```
npm install cmusphinx/node-pocketsphinx
```


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

# Train your own language model

If your TJBot has a name other than "Watson" or "TJ" you need to train your own custom language model.

## Train the custom language model

Save this text file locally and append your TJBot name on a new line: https://raw.githubusercontent.com/MarzlS/tjbotlocallib/master/resources/ps/tjbot.corpus.txt

Open http://www.speech.cs.cmu.edu/tools/lmtool-new.html, upload the text file let the site generate lm and dic files.

Download the .lm and .dic file and store them to a folder. For me the file names were 4372.lm and 4372.dic and I saved them to `/home/pi/Documents/Pocketsphinx`.

Do a test using the new language model: 

pocketsphinx_continuous -lm /home/pi/Documents/Pocketsphinx/4372.lm -dict /home/pi/Documents/Pocketsphinx/4372.dic -samprate 16000 -adcdev plughw:1,0 -inmic yes  -logfn /dev/null

## Update your TJBot configuration

Add the following lines to your TJBot configuration file `config.js`:

```
    ...
    locallisten: {
        dictionary: '/home/pi/Documents/Pocketsphinx/4372.dic', // pronounciation dictionary input file
        languageModel: '/home/pi/Documents/Pocketsphinx/4372.lm', // trigram language model input file
    },
    ...
```


# Contributing
I encourage you to make enhancements to this library and contribute them back to me via a pull request.

# License
This project uses the [Apache License Version 2.0](LICENSE) software license.



