// LiquidRipple.js — reactive liquid ripples (p5.js + FFT)
// Matches your template pattern: function ctor + this.draw + optional onResize
// Uses global `fourier` (same as your other visualisers).

function LiquidRipple() {
  this.name = "liquid";

  //  Tunables 
  this.bgFade = 18;           // motion blur; set 255 for crisp non-trail
  this.maxRipples = 40;       // cap on active ripples
  this.baseSpeed = 3.2;       // ripple expansion speed (px/frame)
  this.damping = 0.985;       // slows expansion a touch per frame
  this.ringFade = 0.985;      // alpha decay per frame for ripple rings
  this.waveAmp = 26;          // amplitude for background "liquid" waves
  this.waveLines = 12;        // how many liquid scanlines across the screen
  this.refract = 0.55;        // vertical wobble amount (0..1)

  //  Internals 
  this._ripples = [];
  this._pad = 0;
  this._t = 0;

  // naive beat detect on bass with cooldown + adaptive threshold
  this._bassAvg = 0;
  this._beatCutoff = 0;
  this._beatHoldFrames = 12;  // cooldown
  this._beatDecay = 0.98;
  this._framesSinceBeat = 0;

  this.onResize = function () {
    this._pad = min(width, height) * 0.06;
  };
  this.onResize();

  // Spawn a ripple at (x,y)
  this._spawn = function (x, y, bass, lowMid) {
    if (this._ripples.length >= this.maxRipples) this._ripples.shift();

    var hueBase = (frameCount * 0.6 + map(lowMid, 0, 255, 0, 90)) % 360;
    this._ripples.push({
      x: x,
      y: y,
      r: 4,
      dr: this.baseSpeed + map(bass, 0, 255, 0, 3.5),
      a: 100,                           // alpha (HSB mode)
      thick: map(bass, 0, 255, 1.5, 5), // ring thickness
      hue: hueBase
    });
  };

  // Simple beat gate on bass
  this._updateBeat = function (bass) {
    // running average for adaptive threshold
    this._bassAvg = lerp(this._bassAvg, bass, 0.08);

    // dynamic cutoff slowly decays
    this._beatCutoff *= this._beatDecay;
    this._framesSinceBeat++;

    // trigger if bass rises above avg + margin and we're past cooldown
    var margin = 28; // sensitivity
    if (bass > this._bassAvg + margin && this._framesSinceBeat > this._beatHoldFrames) {
      this._beatCutoff = bass * 1.05;
      this._framesSinceBeat = 0;
      return true;
    }
    return false;
  };

  this.draw = function () {
    // trailing background
    noStroke();
    fill(0, this.bgFade);
    rect(0, 0, width, height);

    // FFT energies
    var spectrum = fourier.analyze();
    var bass    = fourier.getEnergy('bass');
    var lowMid  = fourier.getEnergy('lowMid');
    var mid     = fourier.getEnergy('mid');
    var treble  = fourier.getEnergy('treble');

    // beat → spawn ripples (center + occasional randoms)
    if (this._updateBeat(bass)) {
      // Primary ripple at center
      this._spawn(width / 2, height / 2, bass, lowMid);

      // Chance of side ripples for richer interference
      if (random() < 0.35) this._spawn(random(this._pad, width - this._pad), random(this._pad, height - this._pad), bass, lowMid);
      if (random() < 0.18) this._spawn(random(this._pad, width - this._pad), random(this._pad, height - this._pad), bass, lowMid);
    }

    // evolve time
    this._t += 0.015 + map(bass, 0, 255, 0, 0.03);

    push();
    colorMode(HSB, 360, 100, 100, 100);
    strokeCap(ROUND);

    //  Liquid background waves (soft water look) 
    // Draw a few horizontal scanlines with sinusoidal wobble.
    var lines = this.waveLines;
    var amp = this.waveAmp + map(mid, 0, 255, 0, 22);
    var wob = this.refract * (1.0 + map(treble, 0, 255, 0, 0.6));
    var hueW = (this._t * 360) % 360;

    noFill();
    stroke(hueW, 60, 26, 30);
    strokeWeight(1.25);

    for (var j = 0; j < lines; j++) {
      var y0 = map(j, 0, lines - 1, this._pad, height - this._pad);
      beginShape();
      for (var x = this._pad; x <= width - this._pad; x += 8) {
        var k = 0.012 + j * 0.0008;                    // spatial frequency
        var y = y0
          + amp * sin(k * x + this._t * 3.0 + j * 0.7) // primary wave
          + wob * amp * sin(0.6 * k * x - this._t * 2.0 + j); // secondary
        vertex(x, y);
      }
      endShape();
    }

    //  Ripples (expanding rings) 
    for (var i = this._ripples.length - 1; i >= 0; i--) {
      var rp = this._ripples[i];

      // ring
      noFill();
      strokeWeight(rp.thick);
      stroke((rp.hue + rp.r * 0.2) % 360, 90, 90, rp.a);
      ellipse(rp.x, rp.y, rp.r * 2, rp.r * 2);

      // faint inner ring for “water surface” look
      strokeWeight(max(1, rp.thick * 0.6));
      stroke((rp.hue + 180) % 360, 70, 70, rp.a * 0.6);
      ellipse(rp.x, rp.y, rp.r * 1.5, rp.r * 1.5);

      // update physics
      rp.r  += rp.dr;
      rp.dr *= this.damping;
      rp.a  *= this.ringFade;

      // prune
      if (rp.a < 2 || rp.r > max(width, height) * 1.4) {
        this._ripples.splice(i, 1);
      }
    }

    pop();
    colorMode(RGB, 255);
  };
}
