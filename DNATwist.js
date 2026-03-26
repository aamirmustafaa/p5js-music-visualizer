// DNATwist.js — horizontal full-width double helix (p5.js + FFT)
// Matches your app’s pattern: function constructor + this.draw + optional onResize
function DNATwist() {
  this.name = "dnatwist";

  
  // Tunables (feel free to tweak live during development)
  
  this.bgFade = 18;             // Motion blur strength (higher = longer trails)
  this.baseTwist = 5.0;         // Baseline twist cycles across the width
  this.rungs = 240;             // Number of vertical “steps” (columns) across the width
  this.amp = 120;               // Base vertical amplitude of the two strands
  this.phaseOffset = Math.PI;   // 180° offset: the second strand mirrors the first
  this._time = 0;               // Internal time (scroll/animation phase)
  this._pad = 0;                // Side margins (computed from canvas)

  // Compute layout on resize so the visual scales with canvas size
  this.onResize = function () {
    this._pad = min(width, height) * 0.06; // 6% of the smaller axis as horizontal padding
  };
  this.onResize();

  
  // Main draw loop
  this.draw = function () {
    // 1) Trailing background (semi-transparent black = motion blur)
    noStroke();
    fill(0, this.bgFade);
    rect(0, 0, width, height);

    // 2) FFT taps (global `fourier`): per-band energy drives dynamics
    var spectrum = fourier.analyze();     // (not used directly here but available)
    var bass    = fourier.getEnergy('bass');   // low end → twist speed + center glow
    var lowMid  = fourier.getEnergy('lowMid'); // body → strand amplitude
    var mid     = fourier.getEnergy('mid');    // presence → rung thickness
    var treble  = fourier.getEnergy('treble'); // sparkle → strand thickness

    // 3) Map audio → parameters (all values ease-friendly and bounded)
    var twistAcross = this.baseTwist + map(bass,   0, 255, 0, 8.0);   // more bass → more twists
    var liveAmp     = this.amp       + map(lowMid, 0, 255, 0, 80);    // more low-mid → taller helix
    var rungThick   = map(mid,       0, 255, 1, 5);                   // more mids → thicker rungs
    var strandThick = map(treble,    0, 255, 1.5, 4);                 // more highs → heavier strand dots

    // Scroll speed: react to bass so the helix “rushes” on kicks
    this._time += 0.015 + map(bass, 0, 255, 0, 0.03);

    push();
    translate(0, height / 2); // center vertically; we draw left→right across the screen

    // 4) Color in HSB for intuitive hue cycling; restore to RGB afterwards
    colorMode(HSB, 360, 100, 100, 100);
    var hueA = (this._time * 120) % 360;      // strand A hue (time-animated)
    var hueB = (hueA + 180) % 360;            // strand B hue (complementary)
    var hueR = (hueA + 60) % 360;             // rungs hue (contrast accent)

    // 5) Geometry prep: full width minus padding, and how many columns (rungs)
    var left  = this._pad;
    var right = width - this._pad;
    var span  = max(10, right - left); // never let span collapse
    var N     = this.rungs;

    strokeCap(ROUND); // rounded line endings look cleaner for rungs

    // 6) Draw the helix column by column across the width
    for (var i = 0; i <= N; i++) {
      var t   = i / N;                 // normalized 0..1 across the width
      var x   = left + t * span;       // world X
      var ang = this._time + t * twistAcross; // phase: time + progressive twist

      // Two sinusoidal strands 180° out of phase → classic DNA look
      var y1 = liveAmp * Math.sin(ang);
      var y2 = liveAmp * Math.sin(ang + this.phaseOffset);

      // Soft brightness falloff toward left/right edges (adds depth)
      var edge    = pow(1.0 - abs(t - 0.5) * 2.0, 0.9); // 1 center → ~0 edges
      var bright  = map(edge, 0, 1, 40, 100);           // dim at edges, bright center

      // Rung: a short vertical line connecting the two strands
      strokeWeight(rungThick);
      stroke(hueR, 80, bright, 70);
      line(x, y1, x, y2);

      // Strand A: a bright point (drawn with stroke + point gives crisp dots)
      strokeWeight(strandThick);
      stroke(hueA, 90, bright, 100);
      point(x, y1);

      // Strand B: complementary color
      stroke(hueB, 90, bright, 100);
      point(x, y2);
    }

    // 7) Bass-reactive glow strip down the center for a subtle “scanner” feel
    var glow = map(bass, 0, 255, 8, 160);
    noStroke();
    fill(hueA, 90, 90, 12);          // very transparent fill → soft bloom
    rect(left, -glow / 2, span, glow);

    pop();
    colorMode(RGB, 255); // restore global color mode for other visuals/UI
  };
}