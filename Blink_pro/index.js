// Defining variables
var xVal = 0;
var predictions;
var smooth = 15;
var threshold = 50;
var leftreading = [];
var rightreading = [];
var leftavg = [];
var rightavg = [];
let beepInterval = null;
let voiceAlertTimeout = null;
let voiceAlertInterval = null;
let flashTimeout = null;
let flashInterval = null;
let eyesClosedAlertGiven = false;
let eyesClosedStartTime = null; // Track when eyes first close

// Function to calculate distance between two 3D points
function distVec(v1, v2) {
  var dx = v1[0] - v2[0];
  var dy = v1[1] - v2[1];
  var dz = v1[2] - v2[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz) * 10;
}

// Function to play voice alert
function playVoiceAlert(message) {
  var msg = new SpeechSynthesisUtterance(message);
  msg.rate = 1;
  window.speechSynthesis.speak(msg);
}

// Function to start voice alert
function startVoiceAlert() {
  speechSynthesis.cancel();
  playVoiceAlert("Wake up you are feeling drowsy! Wake up!");
  voiceAlertInterval = setInterval(() => playVoiceAlert("Wake up you are feeling drowsy! Wake up!"), 3000);
}

// Function to stop voice alert
function stopVoiceAlert() {
  if (voiceAlertInterval) {
    clearInterval(voiceAlertInterval);
    voiceAlertInterval = null;
    speechSynthesis.cancel();
  }
  if (voiceAlertTimeout) {
    clearTimeout(voiceAlertTimeout);
    voiceAlertTimeout = null;
  }
  eyesClosedAlertGiven = false;
  eyesClosedStartTime = null;
}

// Function to start beeping
function startBeep() {
  if (!beepInterval) {
    beepInterval = setInterval(() => {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
      oscillator.connect(audioCtx.destination);
      oscillator.start();
      setTimeout(() => oscillator.stop(), 200);
    }, 1000);
  }
}

// Function to stop beeping
function stopBeep() {
  if (beepInterval) {
    clearInterval(beepInterval);
    beepInterval = null;
  }
}

// Function to start screen flash effect
function startFlash() {
  if (!flashInterval) {
    flashInterval = setInterval(() => {
      document.body.style.backgroundColor = document.body.style.backgroundColor === "red" ? "white" : "red";
    }, 500);
  }
}

// Function to stop screen flash effect
function stopFlash() {
  if (flashInterval) {
    clearInterval(flashInterval);
    flashInterval = null;
    document.body.style.backgroundColor = "white";
  }
}
// Function to print prediction on video feed
function updateCheck(){
  // Get the checkboxa
  var checkBox = document.getElementById("myCheck");
  
  // If the checkbox is checked, display the output text
  if (checkBox.checked == true) {
    checkValue = true;
  } else {
    checkValue = false;
  }
}

// Alert parameters
const BACKEND_URL =`http://localhost:5000/send-sms`;
const SMS_COOLDOWN = 15000;
const VOICE_ALERT_DELAY = 2000;
const FLASH_AND_BEEP_INTERVAL = 15000;
const EYES_CLOSED_THRESHOLD = 500; // Eyes must be closed for at least 500ms before alert

let blinkStartTime = null;
let isBlinking = false;
let lastBackendCallTime = 0;
let alertTriggered = false;
let moodElement = document.getElementById("moodStatus");

callProcessing = function () {
  if (!predictions || predictions.length === 0) return;

  var points = predictions[0]["mesh"];
  let lefteye = (distVec(points[385], points[380]) + distVec(points[386], points[374])) / 2;
  let righteye = (distVec(points[159], points[145]) + distVec(points[158], points[153])) / 2;

  leftreading.push(lefteye);
  rightreading.push(righteye);

  const currentTime = Date.now();
  const leftEyeClosed = leftreading.length > 0 && leftreading.slice(-1)[0] < threshold;
  const rightEyeClosed = rightreading.length > 0 && rightreading.slice(-1)[0] < threshold;

  if (leftEyeClosed && rightEyeClosed) {
   
  
    if (!eyesClosedStartTime) {
      eyesClosedStartTime = currentTime; // Start timing when eyes first close
    }

    if (!eyesClosedAlertGiven && currentTime - eyesClosedStartTime >= EYES_CLOSED_THRESHOLD) {
      moodElement.innerText = "😴 Drowsy";
    moodElement.style.color = "red"; 
      playVoiceAlert("Eyes are closed");
      eyesClosedAlertGiven = true;
    }

    if (!isBlinking) {
      isBlinking = true;
      blinkStartTime = currentTime;
      alertTriggered = false;

      voiceAlertTimeout = setTimeout(() => {
        if (isBlinking) {
          startVoiceAlert();
        }
      }, VOICE_ALERT_DELAY);
    }

    if (currentTime - blinkStartTime >= FLASH_AND_BEEP_INTERVAL) {
      console.log("⏳ Flash and Beep triggered.");
      startBeep();
      startFlash();

      if (!alertTriggered) {
        alertTriggered = true;
        console.log("⏳ Escalation triggered: Flash, Beep & SMS.");

        if (currentTime - lastBackendCallTime >= SMS_COOLDOWN) {
          lastBackendCallTime = currentTime;
          fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ numbers: ["7384476679"] }),
          })
            .then((response) => response.json())
            .then((data) => console.log("✅ SMS Alert Response:", data))
            .catch((error) => console.error("❌ Error sending SMS:", error));
        }
      }

      // Reset the blink start time to keep triggering Flash & Beep every 15 seconds
      blinkStartTime = currentTime;
    }
  } else {

    moodElement.innerText = "😊 Active";
    moodElement.style.color = "green"; 
    isBlinking = false;
    blinkStartTime = null;
    alertTriggered = false;
    stopVoiceAlert();
    stopBeep();
    stopFlash();
    eyesClosedAlertGiven = false;
    eyesClosedStartTime = null;
    console.log("🟢 User is awake. Resetting alerts.");
  }
};

// Call main function
main();