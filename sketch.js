//global for the controls and input
var controls = null;
//store visualisations in a container
var vis = null;
//variable for the p5 sound object
// Sound file is loaded lazily on user interaction. See PlaybackButton.hitCheck().
var sound = null;

// keep track of which audio mode is currently selected. Possible values:
// 'track1' (default), 'track2', or 'mic'.
var audioMode = "track1";

// Help HUD visibility state
var showHelp = false;

// Screenshot notification state
var showNotification = false;
var notificationTimer = 0;
var notificationMessage = "";

// remember the path of the currently loaded track so we can determine when to reload
var loadedTrackPath = null;

// microphone input (created in setup but only started when mic mode is playing)
var mic = null;

// variable for p5 fast fourier transform
var fourier;

/*
 * NOTE:
 * The original implementation loaded the default music file during the preload() phase. When
 * running this project through certain development servers (for example, VS Code's Live
 * Server) this behaviour can cause the browser to immediately attempt to download the
 * `.mp3` file instead of streaming it for the sketch. To avoid that, we remove the
 * preload() function entirely and defer loading the sound until the user clicks the
 * playback button. The sound file will only be requested once a user interacts with
 * the page, which prevents the automatic download on page load.
 */

// We intentionally omit a preload() function here so that the sketch starts without
// requesting any audio assets. The sound will be loaded on demand in
// PlaybackButton.hitCheck().

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
  controls = new ControlsAndInput();

  //instantiate the fft object
  fourier = new p5.FFT();

  // prepare microphone input (but do not start it yet). This will ask
  // for permission only when `start()` is called from the playback button.
  mic = new p5.AudioIn();

  //create a new visualisation container and add visualisations
  vis = new Visualisations();
  vis.add(new Spectrum());
  vis.add(new WavePattern());
  vis.add(new CircleWave());
  vis.add(new Needles());
  vis.add(new WaveRings());
  vis.add(new BarGrid());
  vis.add(new RadialBurst());
  vis.add(new DNATwist());
  vis.add(new FractalTree());
  vis.add(new LiquidRipple());
  vis.add(new Heartbeat());
  vis.add(new Fireworks());
  vis.add(new Fireplace());
}

function draw() {
  background(0);
  //draw the selected visualisation
  vis.selectedVisual.draw();
  //draw the controls on top.
  controls.draw();

  // Draw keyboard shortcuts info at top right
  drawKeyboardShortcuts();

  // Draw help HUD if visible
  if (showHelp) {
    drawHelpHUD();
  }

  // Draw notification if active
  if (showNotification) {
    drawNotification();
    notificationTimer--;
    if (notificationTimer <= 0) {
      showNotification = false;
    }
  }
}

function mouseClicked() {
  controls.mousePressed();
}

function keyPressed() {
  // Handle fullscreen toggle with 'F' key (keyCode 70)
  if (keyCode === 70) {
    // 'F' key
    toggleFullscreen();
  }

  // Handle help HUD toggle with 'H' key (keyCode 72)
  if (keyCode === 72) {
    // 'H' key
    showHelp = !showHelp;
    return; // Don't pass to controls
  }

  // Handle mic mode toggle with 'M' key (keyCode 77)
  if (keyCode === 77) {
    // 'M' key
    toggleMicMode();
    return; // Don't pass to controls
  }

  // Handle screenshot with 'S' key (keyCode 83)
  if (keyCode === 83) {
    // 'S' key
    takeScreenshot();
    return; // Don't pass to controls
  }
  
  // Handle track cycling with 'T' key (keyCode 84)
  if (keyCode === 84) {
    // 'T' key
    cycleTrack();
    return; // Don't pass to controls
  }

  controls.keyPressed(keyCode);
}

function mouseDragged() {
  controls.mouseDragged();
}

function mouseReleased() {
  controls.mouseReleased();
}

//when the window has been resized. Resize canvas to fit
//if the visualisation needs to be resized call its onResize method
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (vis.selectedVisual.hasOwnProperty("onResize")) {
    vis.selectedVisual.onResize();
  }
}

// Toggle fullscreen mode
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    // Enter fullscreen
    document.documentElement.requestFullscreen().catch((err) => {
      console.log("Error attempting to enable fullscreen:", err);
    });
  } else {
    // Exit fullscreen
    document.exitFullscreen().catch((err) => {
      console.log("Error attempting to exit fullscreen:", err);
    });
  }
}

// Draw keyboard shortcuts info at top right
function drawKeyboardShortcuts() {
  push();

  // Position at top right corner
  const margin = 20;
  const textX = width - margin;
  const textY = margin;

  // Background box for better readability - darker and more opaque
  fill(0, 0, 0, 180);
  noStroke();
  const boxWidth = 200;
  const boxHeight = 60;
  rect(textX - boxWidth, textY, boxWidth, boxHeight, 5);

  // Text content with better contrast
  fill(255, 255, 255);
  textAlign(RIGHT, TOP);
  textSize(14);
  textStyle(NORMAL);

  text("Press H for Help", textX - 10, textY + 12);
  text("Press S for Screenshot", textX - 10, textY + 32);

  pop();
}

// Draw help HUD overlay
function drawHelpHUD() {
  push();

  // Simple semi-transparent background
  fill(0, 0, 0, 180);
  noStroke();
  rect(0, 0, width, height);

  // Help panel background
  const panelWidth = 500;
  const panelHeight = 435;
  const panelX = (width - panelWidth) / 2;
  const panelY = (height - panelHeight) / 2;

  fill(30, 30, 30, 240);
  noStroke();
  rect(panelX, panelY, panelWidth, panelHeight, 10);

  // Title
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(24);
  textStyle(BOLD);
  text("🎵 MUSIC VISUALIZER CONTROLS", width / 2, panelY + 40);

  // Help content
  noStroke();
  textAlign(LEFT, TOP);
  textSize(16);
  textStyle(NORMAL);
  const textX = panelX + 30;
  let textY = panelY + 80;
  const lineHeight = 25;

  const helpText = [
    "⌨️ KEYBOARD SHORTCUTS:",
    "",
    "H - Toggle this help panel",
    "M - Toggle microphone mode",
    "S - Take screenshot",
    "T - Cycle through tracks",
    "F - Toggle fullscreen",
    "",
    "🖱️ MOUSE CONTROLS:",
    "",
    "• Click play button to start/stop audio",
    "• Drag volume slider to adjust volume",
    "• Click dropdown to select visualization",
    "• Click track dropdown to change audio source",
    "",
    "💡 Press H again to close this help panel",
  ];

  for (let i = 0; i < helpText.length; i++) {
    noStroke(); // Ensure no outline on text
    if (helpText[i].startsWith("⌨️") || helpText[i].startsWith("🖱️")) {
      fill(120, 220, 255); // Brighter blue for section headers
      textStyle(BOLD);
    } else if (helpText[i] === "") {
      // Skip empty lines
      textY += lineHeight / 2;
      continue;
    } else if (helpText[i].startsWith("💡")) {
      fill(255, 220, 120); // Brighter orange for footer
      textStyle(NORMAL);
    } else {
      fill(255, 255, 255); // Pure white for regular text
      textStyle(NORMAL);
    }

    text(helpText[i], textX, textY);
    textY += lineHeight;
  }

  pop();
}

// Toggle microphone mode
function toggleMicMode() {
  // Stop current audio if playing
  if (sound && typeof sound.isPlaying === "function" && sound.isPlaying()) {
    sound.stop();
  }

  // Stop mic if currently active
  if (mic && mic.enabled) {
    try {
      mic.stop();
    } catch (err) {
      // ignore errors if mic hasn't been started yet
    }
  }

  // Toggle between mic mode and track1
  if (audioMode === "mic") {
    audioMode = "track1";
    console.log("Switched to Track 1 mode");
    notificationMessage = "🎵 Switched to Track 1";
  } else {
    audioMode = "mic";
    console.log("Switched to Microphone mode");
    notificationMessage = "🎤 Switched to Microphone";
  }

  // Show notification
  showNotification = true;
  notificationTimer = 120; // Show for about 2 seconds at 60fps

  // Reset sound and playback state
  sound = null;
  loadedTrackPath = null;
  controls.playbackButton.playing = false;
}

// Cycle through tracks (track1 -> track2 -> track1)
function cycleTrack() {
  // Stop current audio if playing
  if (sound && typeof sound.isPlaying === "function" && sound.isPlaying()) {
    sound.stop();
  }

  // Stop mic if currently active
  if (mic && mic.enabled) {
    try {
      mic.stop();
    } catch (err) {
      // ignore errors if mic hasn't been started yet
    }
  }

  // Cycle only between track1 and track2
  if (audioMode === "track1") {
    audioMode = "track2";
    console.log("Switched to Track 2 mode");
    notificationMessage = "🎵 Switched to Track 2";
  } else {
    // If currently on track2 or mic, switch to track1
    audioMode = "track1";
    console.log("Switched to Track 1 mode");
    notificationMessage = "🎵 Switched to Track 1";
  }

  // Show notification
  showNotification = true;
  notificationTimer = 120; // Show for about 2 seconds at 60fps

  // Reset sound and playback state
  sound = null;
  loadedTrackPath = null;
  controls.playbackButton.playing = false;
}

// Take screenshot
function takeScreenshot() {
  // Create filename with timestamp
  const now = new Date();
  const timestamp =
    now.getFullYear() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0") +
    "_" +
    now.getHours().toString().padStart(2, "0") +
    now.getMinutes().toString().padStart(2, "0") +
    now.getSeconds().toString().padStart(2, "0");

  const filename = "music_vis_screenshot_" + timestamp + ".png";

  // Save the canvas as image
  saveCanvas(filename);

  console.log("Screenshot saved as: " + filename);

  // Optional: Show brief notification
  showScreenshotNotification();
}

// Show a brief notification that screenshot was taken
function showScreenshotNotification() {
  notificationMessage = "📷 Screenshot Saved!";
  showNotification = true;
  notificationTimer = 120; // Show for about 2 seconds at 60fps
}

// Draw notification overlay
function drawNotification() {
  push();

  // Position notification below the keyboard shortcuts text
  const notifWidth = 250;
  const notifHeight = 50;
  const notifX = width - notifWidth - 20;
  const notifY = 100; // Moved down to avoid overlapping with shortcuts text

  // Background
  fill(0, 150, 0, 200);
  stroke(255);
  strokeWeight(1);
  rect(notifX, notifY, notifWidth, notifHeight, 5);

  // Text
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(NORMAL);
  text(notificationMessage, notifX + notifWidth / 2, notifY + notifHeight / 2);

  pop();
}