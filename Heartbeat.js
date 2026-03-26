// Heartbeat.js — pulsing heart + ECG + glow rings (p5.js + FFT) 
// Requires global: fourier (p5.FFT), optional: sound (p5.SoundFile)

function Heartbeat() {
  this.name = "heartbeat";

  /*  Tunables  */
  this.bgFade = 18;          
  this.heartBase = 0.16;      // ⬇ changed (was 0.22) smaller heart
  this.heartPop = 0.0;        
  this.heartPopDecay = 0.90;  // ⬇ slightly slower decay so pop feels natural after reducing amount
  this.ringMax = 10;          
  this.ringSpeed = 6.0;       
  this.ringFade = 0.94;       
  this.ringThick = 6.0;       
  this.gridAlpha = 10;        
  this.ecgStep = 4;           
  this.ecgAmp = 18;           // ⬇ changed (was 34) smaller wave height
  this.ecgNoise = 0.45;       // ⬇ changed (was 0.8) less baseline wobble
  this.ecgColor = true;       

  /*  Internals  */
  this._pad = 0;
  this._t = 0;
  this._hue = 0;

  // Beat detection (adaptive)
  this._bassAvg = 0;
  this._beatCutoff = 0;
  this._beatHoldFrames = 12; 
  this._beatDecay = 0.98;    
  this._framesSinceBeat = 0;

  // Rings + ECG buffers
  this._rings = [];
  this._ecg = [];
  this._pendingPulse = [];   

  this.onResize = function () {
    this._pad = min(width, height) * 0.06;
    var span = max(10, width - 2 * this._pad);
    var needed = floor(span / this.ecgStep) + 2;
    this._ecg = [];
    for (var i = 0; i < needed; i++) this._ecg.push(0);
  };
  this.onResize();

  /*  Helpers  */

  this._updateBeat = function (bass) {
    this._bassAvg = lerp(this._bassAvg, bass, 0.08);
    this._beatCutoff *= this._beatDecay;
    this._framesSinceBeat++;

    var margin = 28;
    if (bass > this._bassAvg + margin && this._framesSinceBeat > this._beatHoldFrames) {
      this._beatCutoff = bass * 1.05;
      this._framesSinceBeat = 0;
      return true;
    }
    return false;
  };

  // Make an ECG spike pattern (reduced overall scale)
  this._makeEcgPulse = function (intensity) {
    var base = [0, 0.6, -2.8, 6.5, -3.2, 1.2, 0.5, 0.2, 0];
    // ⬇ changed scale range (was 0.8..1.6 * ecgAmp). Now gentler 0.6..1.2 * ecgAmp
    var scale = map(intensity, 0, 255, 0.6, 1.2) * this.ecgAmp;
    var pat = [];
    for (var i = 0; i < base.length; i++) {
      var v = base[i] * scale;
      pat.push(v, v, v);
    }
    return pat;
  };

  // Heart parametric curve
  this._heartVertex = function (t, s) {
    var ct = Math.cos(t), st = Math.sin(t);
    var x = 16 * Math.pow(st, 3);
    var y = -(13 * ct - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return { x: x * s, y: y * s };
  };

  // Spawn a glow ring on beat
  this._spawnRing = function (hue, bass, mid) {
    if (this._rings.length >= this.ringMax) this._rings.shift();
    this._rings.push({
      r: 10,
      a: 100,
      thick: this.ringThick + map(mid, 0, 255, 0, 6),
      hue: hue,
      dr: this.ringSpeed + map(bass, 0, 255, 0, 3.0)
    });
  };

  /* ===== Main draw ===== */
  this.draw = function () {
    // trailing background
    noStroke();
    fill(0, this.bgFade);
    rect(0, 0, width, height);

    // optional faint grid
    if (this.gridAlpha > 0) {
      stroke(255, this.gridAlpha);
      strokeWeight(1);
      for (var gx = floor(this._pad); gx <= width - this._pad; gx += 40) line(gx, this._pad, gx, height - this._pad);
      for (var gy = floor(this._pad); gy <= height - this._pad; gy += 40) line(this._pad, gy, width - this._pad, gy);
      noStroke();
    }

    // audio analysis
    var spectrum = fourier.analyze();
    var bass    = fourier.getEnergy('bass');
    var lowMid  = fourier.getEnergy('lowMid');
    var mid     = fourier.getEnergy('mid');
    var treble  = fourier.getEnergy('treble');

    var beat = this._updateBeat(bass);
    if (beat) {
      this.heartPop = 0.20;                     // ⬇ changed (was 0.35) smaller pop
      this._pendingPulse = this._makeEcgPulse(bass);
      this._spawnRing(this._hue, bass, mid);
    } else {
      this.heartPop *= this.heartPopDecay;
    }

    this._t += 0.012 + map(bass, 0, 255, 0, 0.02);
    this._hue = (this._hue + 0.4 + map(treble, 0, 255, 0, 0.3)) % 360;

    push();
    translate(width / 2, height / 2);
    colorMode(HSB, 360, 100, 100, 100);
    strokeCap(ROUND);

    /*  1) Heart  */
    // ⬇ changed bass influence (was up to +0.25), now gentler +0.12
    var s = (min(width, height) * this.heartBase) * (1 + map(bass, 0, 255, 0, 0.12) + this.heartPop);
    var hueHeart = (this._hue + 300) % 360;

    // soft glow
    noStroke();
    fill(hueHeart, 90, 60, 12);
    ellipse(0, 0, s * 4.0, s * 4.0);
    fill(hueHeart, 90, 80, 18);
    ellipse(0, 0, s * 2.8, s * 2.8);

    // heart fill
    fill(hueHeart, 90, 90, 90);
    beginShape();
    for (var t = 0; t <= Math.PI * 2.001; t += 0.035) {
      var v = this._heartVertex(t, s / 16);
      vertex(v.x, v.y);
    }
    endShape(CLOSE);

    // outline
    noFill();
    stroke((hueHeart + 20) % 360, 90, 100, 100);
    strokeWeight(3);
    beginShape();
    for (var t2 = 0; t2 <= Math.PI * 2.001; t2 += 0.028) {
      var vv = this._heartVertex(t2, s / 16);
      vertex(vv.x, vv.y);
    }
    endShape();

    /* 2) Glow rings  */
    for (var i = this._rings.length - 1; i >= 0; i--) {
      var R = this._rings[i];
      noFill();
      stroke(R.hue, 90, 100, R.a);
      strokeWeight(R.thick);
      ellipse(0, 0, R.r * 2, R.r * 2);

      stroke((R.hue + 180) % 360, 70, 80, R.a * 0.6);
      strokeWeight(max(1.5, R.thick * 0.6));
      ellipse(0, 0, R.r * 1.4, R.r * 1.4);

      R.r += R.dr;
      R.a *= this.ringFade;
      R.thick *= 0.992;

      if (R.a < 2 || R.r > max(width, height) * 1.5) this._rings.splice(i, 1);
    }

    pop();

    /*  3) ECG  */
    push();
    colorMode(HSB, 360, 100, 100, 100);

    var left = this._pad, right = width - this._pad, span = max(10, right - left);
    // ⬇ base contribution reduced (0.18 → 0.12)
    var base = map(lowMid, 0, 255, -this.ecgAmp * 0.12, this.ecgAmp * 0.12);
    var jitter = (noise(frameCount * 0.07) - 0.5) * this.ecgNoise * (1 + treble / 255);
    var next = base + jitter;

    if (this._pendingPulse.length > 0) next += this._pendingPulse.shift();

    this._ecg.push(next);
    var needed = floor(span / this.ecgStep) + 2;
    while (this._ecg.length > needed) this._ecg.shift();

    // line
    noFill();
    var ecgHue = (this._hue + 120) % 360;
    if (!this.ecgColor) {
      stroke(120, 100, 90, 90);
    } else {
      stroke(ecgHue, 90, 100, 90);
    }
    strokeWeight(2);

    beginShape();
    for (var k = 0; k < this._ecg.length; k++) {
      var x = left + k * this.ecgStep;
      var y = height * 0.76 + this._ecg[k];
      vertex(x, y);
    }
    endShape();

    // subtle glow
    stroke(this.ecgColor ? ecgHue : 120, 90, 100, 20);
    strokeWeight(8);
    beginShape();
    for (var kk = 0; kk < this._ecg.length; kk++) {
      var xx = left + kk * this.ecgStep;
      var yy = height * 0.76 + this._ecg[kk];
      vertex(xx, yy);
    }
    endShape();

    pop();
    colorMode(RGB, 255);
  };
}
