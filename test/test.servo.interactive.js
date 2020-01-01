/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
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

const TJBotLocal = require('../lib/tjbotlocal');
const config = require('./config');

var credentials = config.credentials;
var hardware = ['microphone', 'servo'];

var tjConfig = config.tjConfig;

// instantiate our TJBot!
var tj = new TJBotLocal(hardware, tjConfig, credentials);

console.log("This is an interactive test of the servo");
console.log("You may speak the following commands:");
console.log("  raise: raises the servo by one increment (+100)");
console.log("  lower: lowers the servo by one increment (-100)");
console.log("  top: moves the servo to the top of the range");
console.log("  wave: make the arm wave");

var servoPosition = tj._SERVO_ARM_UP;
tj.raiseArm();

// listen for speech
tj.listen(function(msg) {
    if (msg.startsWith("raise")) {
        console.log("raising arm");
        tj.raiseArm();
    } else if (msg.startsWith("lower")) {
        console.log("lowering arm");
        tj.lowerArm();
    } else if (msg.startsWith("top")) {
        console.log("moving servo to top of the range");
        tj.armBack();
    } else if (msg.startsWith("wave")) {
        console.log("waving");
        tj.wave();
    }
});
