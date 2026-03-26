// Fireworks.js — clean, high-contrast fireworks (solid black bg, musical bursts)
// Requires: p5, p5.sound, and a global `fourier = new p5.FFT(...)`
function Fireworks() {
  this.name = "fireworks";

  /* 
   Look & Feel (Styling)
    */
  this.useTrails = false; // false = SOLID BLACK each frame (crisp). true = subtle trails.
  this.bgAlpha   = 22;    // trail strength when useTrails=true (lower alpha = longer trails)

  /* 
   Physics (Motion Model)
    */
  this.gravity = 0.25; // downward pull on sparks
  this.drag    = 0.992; // air resistance (multiplies velocity each frame)

  /* 
    Spawning (Performance & Shape)
    */
  this.maxActive    = 1400;                // hard cap on particles to protect FPS
  this.rocketSpeed  = { min: 9.5, max: 14.0 }; // initial rocket speed range
  this.rocketSpread = 0.32;                // radians; cone spread for launch angle
  this.burstCount   = { min: 80, max: 180 };    // sparks per burst (scaled by energy)
  this.lifeRange    = { min: 42, max: 85 };     // spark lifetime (frames)

  /* 
    Color (HSB workflow)
    */
  this._hue = 0;                 // base hue that cycles over time
  this.hueShiftPerFrame = 0.5;   // hue delta per frame (plus treble add-on)

  /* 
    Internals (State)
     */
  this._pad  = 0;     // scene padding from edges
  this._pool = [];     // object pool for dead particles (GC-friendly)
  this._live = [];     // active particles
  this._bassAvg = 0;   // moving average for simple beat gate
  this._hold = 0;      // refractory frames after a beat (prevents double triggers)

  // Responsive layout: recompute padding on resize
  this.onResize = function () {
    this._pad = Math.min(width, height) * 0.06;
  };
  this.onResize();

  /* 
    Object Pool Helpers
    */
  this._get  = function () { return this._pool.length ? this._pool.pop() : {}; };
  this._free = function (p) { this._pool.push(p); };
  this._push = function (p) { if (this._live.length < this.maxActive) this._live.push(p); };

  /* 
   * Beat Gate (very light)
   * Detects a bass "hit" when current bass exceeds its moving avg + offset.
   * A short hold prevents spam on sustained bass.
    */
  this._beat = function (bass) {
    this._bassAvg = lerp(this._bassAvg, bass, 0.08); // smooth moving average
    if (this._hold > 0) { this._hold--; return false; }
    var hit = bass > this._bassAvg + 26;
    if (hit) this._hold = 10; // cooldown frames
    return hit;
  };

  /* 
    Spawners
    */

  // Launch a single rocket that travels upward, then bursts at apex
  this._spawnRocket = function (hBase) {
    var p = this._get();
    p.type = 0; // rocket

    // Launch within padded horizontal range
    var left  = this._pad + 50;
    var right = width - this._pad - 50;
    p.x = random(left, right);
    p.y = height - this._pad; // start near "ground"

    // Launch angle & speed (slight cone around straight up)
    var a = -HALF_PI + random(-this.rocketSpread, this.rocketSpread);
    var s = random(this.rocketSpeed.min, this.rocketSpeed.max);
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s;

    // Visuals
    p.size = 3;
    p.hue  = (hBase + random(-18, 18) + 360) % 360; // tiny hue variation
    p.sat = 95; p.bri = 100; p.alpha = 100;

    // Life: rockets auto-burst at apex or after maxLife
    p.life = 0;
    p.maxLife = random(26, 44);

    this._push(p);
  };

  // Create a spherical burst with a slight ring bias (clean “donut” look on highs)
  this._burst = function (x, y, hue, bass, mid, treble) {
    // Spark count scales with bass+mid energy
    var nBase = map(bass + mid, 0, 510, this.burstCount.min, this.burstCount.max);
    var N = floor(nBase);

    // Hue jitter wider with more mid; stronger ring with more treble
    var hueJ     = map(mid,    0, 255, 10, 50);
    var ringBias = map(treble, 0, 255, 0.15, 0.8);

    // Target radius for ring-shaped bias
    var rTarget = random(70, 140);

    // Emit sparks
    for (var i = 0; i < N; i++) {
      var s = this._get();
      s.type = 1; // spark

      // Start at the burst origin
      s.x = x; s.y = y;
      s.px = x; s.py = y; // previous pos for drawing “tails”

      // Direction around the circle + tiny random angular jitter
      var ang = (i / N) * TWO_PI + random(-0.01, 0.01);

      // Speed: lerp between random base speed and ring-target speed
      var baseSpeed = random(2.2, 7.0);
      var speed     = lerp(baseSpeed, rTarget / 18.0, ringBias);

      s.vx = Math.cos(ang) * speed;
      s.vy = Math.sin(ang) * speed;

      // Appearance (HSB)
      s.size = random(1.6, 2.6);
      s.hue  = (hue + random(-hueJ, hueJ) + 360) % 360;
      s.sat  = 95; s.bri = 100; s.alpha = 100;

      // Lifetime
      s.life = 0;
      s.maxLife = random(this.lifeRange.min, this.lifeRange.max);

      this._push(s);
    }
  };

  /* 
   * Draw (per frame)
    */
  this.draw = function () {
    // 1) Background: either solid black or faint trails
    if (this.useTrails) {
      noStroke(); fill(0, this.bgAlpha); rect(0, 0, width, height);
    } else {
      background(0); // crisp, no ghosting
    }

    // 2) FFT (guard if not available)
    if (typeof fourier === 'undefined' || !fourier) return;
    fourier.analyze();
    var bass   = fourier.getEnergy('bass');
    var mid    = fourier.getEnergy('mid');
    var treble = fourier.getEnergy('treble');

    // 3) Color base hue progression (faster with treble)
    this._hue = (this._hue + this.hueShiftPerFrame + map(treble, 0, 255, 0, 0.3)) % 360;

    // 4) Launch logic: gentle trickle + extra rockets on bass hits
    var energy    = (bass + mid + treble) / 3;
    var baseSpawn = random() < map(energy, 0, 255, 0.006, 0.05); // energy → spawn probability
    var beat      = this._beat(bass);

    var spawns = baseSpawn ? 1 : 0;
    if (beat) spawns += floor(random(1, 3.2)); // add 1–3 rockets on a kick
    for (var r = 0; r < spawns; r++) this._spawnRocket(this._hue);

    // 5) Ground silhouette for grounding (very subtle)
    noStroke();
    fill(0);
    rect(0, height - this._pad * 0.7, width, this._pad * 0.7);

    // 6) Render + update all particles
    push();
    colorMode(HSB, 360, 100, 100, 100);
    strokeCap(ROUND);

    for (var i = this._live.length - 1; i >= 0; i--) {
      var p = this._live[i];

      if (p.type === 0) {
        /* 
          ROCKET
           */
        // Visual: bright point
        stroke(p.hue, p.sat, p.bri, 90);
        strokeWeight(2.2);
        point(p.x, p.y);

        // Physics: gravity + drag + motion
        p.vy += this.gravity * 0.18; // gentler gravity for rockets
        p.vx *= this.drag; p.vy *= this.drag;
        p.x += p.vx; p.y += p.vy; p.life++;

        // Burst at apex or after maxLife
        var apex = p.life > p.maxLife || p.vy > 0;
        if (apex) {
          this._burst(p.x, p.y, p.hue, bass, mid, treble);
          this._live.splice(i, 1); this._free(p);
        }

      } else {
        /* 
         * SPARK (with tail)
         */
        // Tail from previous position → current (gives motion blur line)
        stroke(p.hue, p.sat, p.bri, p.alpha * 0.6);
        strokeWeight(Math.max(1, p.size * 0.9));
        line(p.px, p.py, p.x, p.y);

        // Core bright point
        stroke(p.hue, p.sat, p.bri, p.alpha);
        strokeWeight(p.size);
        point(p.x, p.y);

        // Save current as previous before physics moves it
        p.px = p.x; p.py = p.y;

        // Physics: stronger gravity for sparks (they fall faster)
        p.vy += this.gravity;
        p.vx *= this.drag; p.vy *= this.drag;
        p.x += p.vx; p.y += p.vy;

        // Lifetime fade + tiny size shrink
        p.life++;
        var t = p.life / p.maxLife;    // 0→1
        p.alpha = 100 * (1.0 - t);     // linear fade
        p.size *= 0.996;               // slight taper

        // Cull dead/off-screen sparks
        if (p.life > p.maxLife || p.y > height + this._pad) {
          this._live.splice(i, 1); this._free(p);
        }
      }
    }
    pop();

    // Restore global color mode for other UI/visuals
    colorMode(RGB, 255);
  };
}