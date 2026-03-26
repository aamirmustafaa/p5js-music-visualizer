// Fireplace.js — cozy audio-reactive fireplace (p5.js + FFT)
// Requires: p5, p5.sound, and a global `fourier = new p5.FFT(...)`

function Fireplace() {
  this.name = "fireplace";

  /*  Look & Feel  */
  this.useTrails = false;  // false = solid black; true = subtle motion trails
  this.bgAlpha   = 26;     // trail strength if useTrails=true (lower = longer trails)

  /*  Flame field  */
  this.columns   = 120;    // horizontal resolution of the flame
  this.maxHeight = 0.48;   // fraction of canvas height the flame can reach
  this.noiseScaleX = 0.012;
  this.noiseScaleT = 0.015;
  this.flameBase   = 0.22; // base height fraction (grows with audio)
  this.flameCurve  = 1.35; // exponent shaping ( >1 = narrower base )

  /*  Embers / Sparks  */
  this.maxSparks   = 350;
  this.sparkSpawn  = 0.04; // base chance per frame (audio scales this)
  this.spark = {
    vUp: { min: 2.0, max: 5.0 },
    vSide: 0.9,
    life: { min: 38, max: 90 }
  };

  /*  Logs / Hearth  */
  this.logHeight   = 22;
  this.logCount    = 3;

  /*  Heat haze (screen-space shimmer)  */
  this.hazeRows   = 10;     // number of horizontal shimmer lines
  this.hazeAmp    = 2.2;    // vertical distortion amplitude (px)
  this.hazeSpeed  = 2.3;    // scroll speed

  /*  Internals  */
  this._pad = 0;
  this._t   = 0;
  this._sparks = [];
  this._pool   = [];

  this.onResize = function () {
    this._pad = Math.min(width, height) * 0.06;
  };
  this.onResize();

  /*  Pool helpers  */
  this._get = function(){ return this._pool.length ? this._pool.pop() : {}; };
  this._free = function(p){ this._pool.push(p); };

  /*  Spark spawner  */
  this._spawnSpark = function (cx, bass, treble) {
    if (this._sparks.length >= this.maxSparks) return;
    var p = this._get();
    p.x = cx + random(-60, 60);
    p.y = height - this._pad - this.logHeight - 6;

    var up = random(this.spark.vUp.min, this.spark.vUp.max) + map(bass, 0, 255, 0, 2.5);
    p.vx = random(-this.spark.vSide, this.spark.vSide);
    p.vy = -up;

    p.life = 0;
    p.maxLife = random(this.spark.life.min, this.spark.life.max);
    p.size = random(1.2, 2.2);
    p.hue  = (30 + map(treble, 0, 255, -6, 10) + random(-6,6) + 360)%360; // warm orange/yellow
    p.sat  = 90; p.bri = 100; p.alpha = 100;

    this._sparks.push(p);
  };

  /*  Draw  */
  this.draw = function () {
    // background
    if (this.useTrails) { noStroke(); fill(0, this.bgAlpha); rect(0, 0, width, height); }
    else { background(0); }

    if (typeof fourier === 'undefined' || !fourier) return;

    // audio
    fourier.analyze();
    var bass   = fourier.getEnergy('bass');
    var lowMid = fourier.getEnergy('lowMid');
    var mid    = fourier.getEnergy('mid');
    var treble = fourier.getEnergy('treble');

    // drive parameters
    var flameH = map(bass + lowMid, 0, 510, this.flameBase, this.maxHeight);
    var wiggle = map(mid, 0, 255, 0.0, 0.7);
    var spawnBoost = map(bass + treble, 0, 510, 0, 0.08);

    this._t += this.noiseScaleT * (1.0 + wiggle);

    // hearth/ground
    noStroke();
    fill(12); // solid dark base
    rect(0, height - this._pad * 0.5, width, this._pad * 0.5);

    // logs (layered rectangles with rounded ends)
    var logY = height - this._pad - this.logHeight;
    for (var i = 0; i < this.logCount; i++) {
      var y = logY - i * (this.logHeight * 0.55);
      var hueLog = 20 + i * 4;
      push();
      translate(width/2, y);
      colorMode(HSB, 360, 100, 100, 100);
      fill(hueLog, 50, 25, 100); // brown
      stroke(hueLog, 60, 35, 100);
      strokeWeight(2);
      rectMode(CENTER);
      var wLog = Math.min(width - this._pad*2, 520 + i*40);
      rect(0, 0, wLog, this.logHeight, 10);
      // bark highlights
      stroke(hueLog, 40, 60, 60);
      line(-wLog*0.35, -4, -wLog*0.1, -4);
      line(wLog*0.1, 3, wLog*0.35, 3);
      pop();
    }

    // flame field (between logs and upward)
    var left  = this._pad;
    var right = width - this._pad;
    var span  = Math.max(10, right - left);
    var cols  = this.columns;
    var baseY = logY - 2;

    push();
    colorMode(HSB, 360, 100, 100, 100);
    noStroke();

    for (var c = 0; c <= cols; c++) {
      var t = c / cols;                      // 0..1 across flame
      var x = left + t * span;

      // inward taper: thinner at sides
      var sideFalloff = Math.pow(1.0 - Math.abs(t - 0.5) * 2.0, this.flameCurve);

      // noise-driven height
      var n = noise(x * this.noiseScaleX, this._t + t * 2.0);
      // audio-influenced height (bass/lowMid stronger)
      var hFrac = sideFalloff * flameH * (0.55 + 0.9 * n);
      var hPx = hFrac * height;

      // color gradient along height (hot white→yellow→orange→red)
      var top = baseY - hPx;
      var steps = Math.max(6, Math.floor(hPx / 8));
      for (var s = 0; s < steps; s++) {
        var k = s / (steps - 1 + 1e-6); // 0..1 bottom->top
        var yy = lerp(baseY, top, k);

        // hue/sat driven by vertical position + treble shimmer
        var hue = 12 + k * 28 + random(-0.6, 0.6) + map(treble, 0, 255, -2, 3);
        var sat = 90 - k * 30;
        var bri = 95 - k * 20 + random(-2, 1);

        fill(hue, sat, bri, 88);
        rect(x, yy, span / cols + 2, Math.max(2, hPx / steps + 1));
      }

      // occasionally spawn sparks above hot spots
      if (random() < this.sparkSpawn + spawnBoost * sideFalloff * n * 0.5) {
        this._spawnSpark(x, bass, treble);
      }
    }
    pop();

    // embers / sparks update & draw
    push();
    colorMode(HSB, 360, 100, 100, 100);
    strokeCap(ROUND);
    for (var i = this._sparks.length - 1; i >= 0; i--) {
      var p = this._sparks[i];

      // trail
      stroke(p.hue, p.sat, p.bri, p.alpha * 0.35);
      strokeWeight(Math.max(1, p.size * 0.8));
      point(p.x, p.y);

      // core
      stroke(p.hue, p.sat, p.bri, p.alpha);
      strokeWeight(p.size + 0.4);
      point(p.x, p.y);

      // physics
      p.vy += 0.04;                // gentle buoyancy decaying (upwards negative vy -> less pull)
      p.vx *= 0.995; p.vy *= 0.995;
      p.x += p.vx;
      p.y += p.vy;

      // fade & die
      p.life++;
      var tlife = p.life / p.maxLife;
      p.alpha = 100 * (1.0 - tlife);
      p.size *= 0.996;

      if (p.life > p.maxLife || p.x < left-40 || p.x > right+40 || p.y < 0) {
        this._sparks.splice(i, 1);
        this._free(p);
      }
    }
    pop();

    // heat-haze shimmer stripes above the fire (simple wavy lines)
    push();
    noFill();
    stroke(255, 20);
    strokeWeight(1);
    var hazeTop = logY - height * (this.maxHeight * 0.9);
    var hazeBot = logY - 6;
    var rows = this.hazeRows;
    for (var r = 0; r < rows; r++) {
      var y = lerp(hazeBot, hazeTop, r / Math.max(1, rows - 1));
      beginShape();
      for (var x2 = left; x2 <= right; x2 += 8) {
        var yy = y + this.hazeAmp * sin((x2 * 0.02) + (frameCount * 0.03) + r * 0.6);
        vertex(x2, yy);
      }
      endShape();
    }
    pop();
  };
}
