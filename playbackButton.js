// Displays and handles clicks on the playback button. This button
// controls playing and pausing the current audio source (track1,
// track2 or microphone) based on the global `audioMode`.
function PlaybackButton() {
  // Position and size of the button
  this.x = 20;
  this.y = 20;
  this.width = 20;
  this.height = 20;

  // Whether audio is currently playing. This is used to decide
  // which icon to draw (play vs pause) and to toggle behaviour.
  this.playing = false;

  // Draw the button. When playing, draw a pause icon; otherwise draw
  // a play icon.
  this.draw = function () {
    if (this.playing) {
      rect(this.x, this.y, this.width / 2 - 2, this.height);
      rect(
        this.x + this.width / 2 + 2,
        this.y,
        this.width / 2 - 2,
        this.height
      );
    } else {
      triangle(
        this.x,
        this.y,
        this.x + this.width,
        this.y + this.height / 2,
        this.x,
        this.y + this.height
      );
    }
  };

  /**
   * Handle a click on the playback button. If the click falls within
   * the button's bounds, toggle playback. Returns true if the click
   * was handled.
   */
  this.hitCheck = function () {
    if (
      mouseX > this.x &&
      mouseX < this.x + this.width &&
      mouseY > this.y &&
      mouseY < this.y + this.height
    ) {
      this.togglePlayback();
      return true;
    }
    return false;
  };

  /**
   * Start playing audio based on the current audioMode without
   * considering toggle state. This is useful when switching audio
   * modes via the track dropdown: if a track or mic was previously
   * playing, we start the newly selected source immediately.
   */
  this.playAudio = function () {
    // Reset playing state
    this.playing = false;

    // Determine the path based on audioMode
    if (audioMode === "mic") {
      // Stop any currently playing sound
      if (sound && typeof sound.isPlaying === "function" && sound.isPlaying()) {
        sound.stop();
      }
      sound = null;
      loadedTrackPath = null;
      // Stop mic if already running
      if (mic && mic.enabled) {
        try {
          mic.stop();
        } catch (e) {
          /* ignore */
        }
      }
      // Start the microphone
      try {
        mic.start();
        fourier.setInput(mic);
        this.playing = true;
      } catch (err) {
        console.error("Microphone error:", err);
      }
      return;
    }

    // For track modes
    // Stop mic if active
    if (mic && mic.enabled) {
      try {
        mic.stop();
      } catch (e) {
        /* ignore */
      }
    }
    // Determine desired track path
    const path =
      audioMode === "track1" ? "assets/sample2.mp3" : "assets/sample3.mp3";

    // Stop any currently playing sound
    if (sound && typeof sound.isPlaying === "function" && sound.isPlaying()) {
      sound.stop();
    }
    sound = null;
    loadedTrackPath = null;

    // Load and play the new track
    loadSound(
      path,
      (loadedSound) => {
        sound = loadedSound;
        loadedTrackPath = path;
        // Apply volume from slider
        if (controls && controls.volumeSlider) {
          try {
            sound.setVolume(controls.volumeSlider.getVolume());
          } catch (e) {
            /* ignore */
          }
        }
        sound.loop();
        fourier.setInput(sound);
        this.playing = true;
      },
      (err) => {
        console.error("Failed to load sound file:", err);
      }
    );
  };

  /**
   * Toggle playback of the current source. If audioMode is set to
   * 'mic', this toggles the microphone on or off. For track modes,
   * toggling will play/pause the current track if it is the same as
   * the desired track, or load the new track if switching from a
   * different track.
   */
  this.togglePlayback = function () {
    // Handle microphone mode
    if (audioMode === "mic") {
      // Stop any playing sound
      if (sound && typeof sound.isPlaying === "function" && sound.isPlaying()) {
        sound.stop();
      }
      sound = null;
      loadedTrackPath = null;
      // Toggle mic
      try {
        if (!this.playing) {
          // Start mic
          mic.start();
          fourier.setInput(mic);
          this.playing = true;
        } else {
          // Stop mic
          mic.stop();
          fourier.setInput(null);
          this.playing = false;
        }
      } catch (err) {
        console.error("Microphone error:", err);
      }
      return;
    }

    // For track modes
    // Stop mic if active
    if (mic && mic.enabled) {
      try {
        mic.stop();
      } catch (e) {
        /* ignore */
      }
    }

    // Determine desired track path
    const path =
      audioMode === "track1" ? "assets/sample2.mp3" : "assets/sample3.mp3";

    // If a sound is loaded and it matches the desired track
    if (sound && loadedTrackPath === path) {
      // Toggle play/pause
      if (sound.isPlaying()) {
        sound.pause();
        this.playing = false;
      } else {
        sound.loop();
        // Apply volume from slider
        if (controls && controls.volumeSlider) {
          try {
            sound.setVolume(controls.volumeSlider.getVolume());
          } catch (e) {
            /* ignore */
          }
        }
        fourier.setInput(sound);
        this.playing = true;
      }
      return;
    }

    // Otherwise, load and play the new track
    // Stop existing sound
    if (sound && typeof sound.isPlaying === "function" && sound.isPlaying()) {
      sound.stop();
    }
    sound = null;
    loadedTrackPath = null;

    loadSound(
      path,
      (loadedSound) => {
        sound = loadedSound;
        loadedTrackPath = path;
        // Apply volume from slider
        if (controls && controls.volumeSlider) {
          try {
            sound.setVolume(controls.volumeSlider.getVolume());
          } catch (e) {
            /* ignore */
          }
        }
        sound.loop();
        fourier.setInput(sound);
        this.playing = true;
      },
      (err) => {
        console.error("Failed to load sound file:", err);
      }
    );
  };
}
