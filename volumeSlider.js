// VolumeSlider: a simple horizontal slider to control global audio volume.
// Works with p5.sound's `sound` object (expects a global `sound`).
function VolumeSlider() {
  // ── Layout / sizing (pixels)
  this.x = 60;       // left edge (placed near your play button)
  this.y = 20;       // top edge
  this.width = 100;  // total slider length
  this.height = 20;  // hit area height (for easier clicking)
  this.sliderHeight = 6; // visual thickness of the track
  this.knobSize = 12;    // diameter of the knob

  // ── State
  this.volume = 0.5;     // 0..1 (default: 50%)
  this.isDragging = false;

  // Apply initial volume if a sound is already loaded
  if (typeof sound !== "undefined" && sound) {
    sound.setVolume(this.volume);
  }

  // Draw the slider UI (track, fill, knob, icon)
  this.draw = function () {
    push();

    // Track (full length, neutral color)
    stroke(200);
    strokeWeight(this.sliderHeight);
    line(
      this.x,
      this.y + this.height / 2,
      this.x + this.width,
      this.y + this.height / 2
    );

    // Filled portion (current volume level)
    stroke(100, 150, 255);
    strokeWeight(this.sliderHeight);
    line(
      this.x,
      this.y + this.height / 2,
      this.x + this.width * this.volume,
      this.y + this.height / 2
    );

    // Knob (draggable handle)
    let knobX = this.x + this.width * this.volume;
    let knobY = this.y + this.height / 2;
    fill(255);
    stroke(100);
    strokeWeight(2);
    ellipse(knobX, knobY, this.knobSize, this.knobSize);

    // Tiny volume icon for clarity
    fill(255);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(12);
    text("🔊", this.x + this.width + 10, this.y + this.height / 2);

    pop();
  };

  // Returns true if the mouse is within the slider's hit box
  this.isMouseOver = function () {
    return (
      mouseX >= this.x &&
      mouseX <= this.x + this.width &&
      mouseY >= this.y &&
      mouseY <= this.y + this.height
    );
  };

  // Mouse down: start dragging if cursor is over the slider
  this.mousePressed = function () {
    if (this.isMouseOver()) {
      this.isDragging = true;
      this.updateVolume(); // snap to where the user clicked
      return true;         // indicate the event was handled
    }
    return false;
  };

  // Mouse move while button held: update volume continuously
  this.mouseDragged = function () {
    if (this.isDragging) {
      this.updateVolume();
    }
  };

  // Mouse up: stop dragging
  this.mouseReleased = function () {
    this.isDragging = false;
  };

  // Map mouse x-position → volume (0..1) and apply to `sound`
  this.updateVolume = function () {
    if (this.isMouseOver() || this.isDragging) {
      const relativeX = mouseX - this.x;
      this.volume = constrain(relativeX / this.width, 0, 1);

      if (typeof sound !== "undefined" && sound) {
        sound.setVolume(this.volume);
      }
    }
  };

  // Public getter: current volume (0..1)
  this.getVolume = function () {
    return this.volume;
  };

  // Public setter: set volume programmatically and apply immediately
  this.setVolume = function (vol) {
    this.volume = constrain(vol, 0, 1);
    if (typeof sound !== "undefined" && sound) {
      sound.setVolume(this.volume);
    }
  };
}