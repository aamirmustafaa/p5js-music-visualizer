// FractalTree.js — reactive fractal tree (p5.js + FFT)
// Style matches your other templates: function ctor + this.draw + optional onResize

function FractalTree() {
  this.name = "fractaltree";

  // Tunables
  this.bgFade = 18; // motion blur (higher = longer trails)
  this.baseLen = 220; // trunk length at 1080p (auto-scales) - increased from 130
  this.maxDepth = 9; // recursion depth (performance vs detail)
  this.branchRatio = 0.68; // child length = parent * ratio
  this.spreadBase = 0.45; // base spread (radians) between branches
  this.wind = 0.0; // small sway for life

  // internal
  this._pad = 0;
  this._time = 0;

  this.onResize = function () {
    // scale trunk roughly with canvas height - increased scaling factor
    var scale = height / 1080;
    this._pad = min(width, height) * 0.06;
    this._baseLenPx = this.baseLen * max(0.8, scale * 1.3); // increased from max(0.6, scale)
  };
  this.onResize();

  this.draw = function () {
    // trailing background
    noStroke();
    fill(0, this.bgFade);
    rect(0, 0, width, height);

    // FFT energy
    var spectrum = fourier.analyze();
    var bass = fourier.getEnergy("bass"); // 20–140 Hz
    var lowMid = fourier.getEnergy("lowMid"); // 140–400
    var mid = fourier.getEnergy("mid"); // 400–2.6k
    var treble = fourier.getEnergy("treble"); // 6k–20k

    // map audio → parameters
    // Angle spread reacts to bass, so kicks open the tree.
    var spread = this.spreadBase + map(bass, 0, 255, 0.0, 0.45);
    // Thickness reacts to mid; higher mids = thicker branches.
    var trunkThick = map(mid, 0, 255, 10, 24); // increased from (6, 16) to (10, 24)
    // Color hue reacts to treble (shifts along a neon palette).
    var hueBase = (frameCount * 0.6 + map(treble, 0, 255, 0, 120)) % 360;

    this._time += 0.01 + map(lowMid, 0, 255, 0.0, 0.02);
    this.wind = 0.08 * sin(this._time * 2.2); // gentle side sway

    push();
    translate(width / 2, height - this._pad); // ground/root point

    colorMode(HSB, 360, 100, 100, 100);
    strokeCap(ROUND);

    // Draw the tree (recursive)
    this._branch(
      this._baseLenPx,
      -HALF_PI,
      this.maxDepth,
      trunkThick,
      spread,
      hueBase
    );

    pop();
    colorMode(RGB, 255);
  };

  // Recursive branch function
  this._branch = function (len, angle, depth, thick, spread, hueBase) {
    if (depth <= 0 || len < 2) return;

    // compute end point of this segment
    var x2 = len * Math.cos(angle);
    var y2 = len * Math.sin(angle);

    // brightness fades with depth
    var bright = map(depth, 0, this.maxDepth, 40, 100);
    var alpha = map(depth, 0, this.maxDepth, 40, 100);

    // draw current segment
    strokeWeight(thick);
    stroke((hueBase + depth * 8) % 360, 90, bright, alpha);
    line(0, 0, x2, y2);

    // move to end and branch
    push();
    translate(x2, y2);

    // next level parameters
    var nextLen = len * this.branchRatio;
    var nextThick = max(1.2, thick * 0.72);

    // Add subtle wind sway + per-branch jitter so it feels alive
    var sway = this.wind * (1.0 - depth / (this.maxDepth + 0.0001));
    var jitter = 0.06 * noise(x2 * 0.01, y2 * 0.01, frameCount * 0.01);

    // Left branch
    this._branch(
      nextLen,
      angle - spread + sway - jitter,
      depth - 1,
      nextThick,
      spread,
      hueBase
    );
    // Right branch
    this._branch(
      nextLen,
      angle + spread + sway + jitter,
      depth - 1,
      nextThick,
      spread,
      hueBase
    );

    // Optional third “twig” occasionally (reacts to treble peaks)
    if (random() < 0.12) {
      this._branch(
        nextLen * 0.8,
        angle + sway + random(-0.35, 0.35),
        depth - 2,
        max(1, nextThick * 0.7),
        spread * 0.85,
        hueBase + 30
      );
    }

    pop();
  };
}
