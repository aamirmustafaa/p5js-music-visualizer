// Final, optimized version of the Needles visualization
// Four analog-style meters (bass, lowMid, highMid, treble) with
// animated needles, glowing arcs, labels, and a subtle particle backdrop.
function Needles() {
  this.name = "needles";

  // Needle sweep limits so the pointer stays within a realistic arc
  const minAngle = PI + PI / 10;       // left bound (a bit above 180°)
  const maxAngle = TWO_PI - PI / 10;   // right bound (a bit below 360°)

  // Layout: meters arranged in a 2×2 grid
  this.plotsAcross = 2;
  this.plotsDown = 2;

  // Frequency bins we listen to (p5.Sound named bands)
  this.frequencyBins = ["bass", "lowMid", "highMid", "treble"];

  // Smoothed energy values (for stable needle motion)
  this.prevEnergy = [0, 0, 0, 0];

  // Per-bin colors
  this.freqColors = [
    { r: 255, g: 50,  b: 50  }, // bass = red
    { r: 50,  g: 255, b: 50  }, // lowMid = green
    { r: 50,  g: 50,  b: 255 }, // highMid = blue
    { r: 255, g: 255, b: 50  }  // treble = yellow
  ]; 

  // Soft background "breathing" value (used by some visuals)
  this.pulseSize = 0;
  this.pulseDirection = 1;

  // Ambient particles for depth (float upward)
  this.particles = Array.from({ length: 100 }, () => ({
    x: random(width),
    y: random(height),
    size: random(1, 15),
    speed: random(0.2, 1)
  }));

  // Compute per-meter geometry on resize
  this.onResize = () => {
    this.pad = width / 25;
    this.plotWidth  = (width  - this.pad) / this.plotsAcross;
    this.plotHeight = (height - this.pad) / this.plotsDown;

    // Dial radius is constrained by available cell space
    this.dialRadius = Math.min(
      (this.plotWidth  - this.pad) / 2 - 15,
      (this.plotHeight - this.pad) / 2 - 25
    );

    // Respawn particles to fill the new viewport
    this.particles.forEach(p => {
      p.x = random(width);
      p.y = random(height);
    });
  };
  this.onResize();

  // Per-frame draw
  this.draw = () => {
    // Refresh FFT once per frame (global `fourier`)
    fourier.analyze();

    // Update ambient particles in the background
    this.updateParticles();

    push();

    // Slow pulse value for subtle UI effects
    this.pulseSize += 0.05 * this.pulseDirection;
    if (this.pulseSize > 1 || this.pulseSize < 0) this.pulseDirection *= -1;

    // Draw meters row by row
    let currentBin = 0;
    for (let i = 0; i < this.plotsDown; i++) {
      for (let j = 0; j < this.plotsAcross; j++) {
        // Position/size of the current cell
        let x = j * this.plotWidth  + this.pad * 0.8;
        let y = i * this.plotHeight + this.pad * 0.8;
        let w = this.plotWidth  - this.pad * 1.2;
        let h = this.plotHeight - this.pad * 1.2;

        // Get instantaneous energy for this bin
        let energy = fourier.getEnergy(this.frequencyBins[currentBin]);

        // Exponential smoothing (lerp 10%) for a stable needle
        this.prevEnergy[currentBin] = lerp(this.prevEnergy[currentBin], energy, 0.1);
        let smoothEnergy = this.prevEnergy[currentBin];

        // Layered draw calls: frame, decorations, ticks, needle
        this.drawMeterBackground(x, y, w, h, currentBin, smoothEnergy);
        this.drawDecorativeElements(x, y, w, h, currentBin, smoothEnergy);
        this.ticks(x + w / 2, y + h, currentBin, smoothEnergy);
        this.needle(smoothEnergy, x + w / 2, y + h, currentBin);

        currentBin++;
      }
    }
    pop();
  };

  // ─────────────────────────────────────────
  // Background particle field (adds depth)
  // ─────────────────────────────────────────
  this.updateParticles = () => {
    push();
    noStroke();

    // Average of smoothed energies to modulate particle motion/opacity
    const avgEnergy = this.prevEnergy.reduce((a, b) => a + b) / this.prevEnergy.length;
    const energyFactor = map(avgEnergy, 0, 255, 0.5, 2);

    for (let p of this.particles) {
      // Float upward faster when music is more energetic
      p.y -= p.speed * energyFactor;

      // Recycle at the bottom when off-screen
      if (p.y < 0) {
        p.y = height;
        p.x = random(width);
      }

      // Soft white glow, stronger with energy
      fill(255, map(avgEnergy, 0, 255, 50, 150));
      const size = p.size * energyFactor;
      ellipse(p.x, p.y, size, size);
    }
    pop();
  };

  // ─────────────────────────────────────────
  // Meter frame: glowing layered rectangles + inner dark panel
  // ─────────────────────────────────────────
  this.drawMeterBackground = (x, y, w, h, binIndex, energy) => {
    push();
    const c = this.freqColors[binIndex];
    const intensity = map(energy, 0, 255, 0.2, 0.9);

    noStroke();
    // Outer glow layers
    for (let i = 0; i < 5; i++) {
      fill(c.r, c.g, c.b, map(i, 0, 5, 180 * intensity, 20 * intensity));
      rect(x + i, y + i, w - i * 2, h - i * 2, 10);
    }

    // Inner dark panel (contrast)
    fill(20, 20, 30, 230);
    rect(x + 5, y + 5, w - 10, h - 10, 8);
    pop();
  };

  // ─────────────────────────────────────────
  // Labels, pulsing rings, and numeric energy readout
  // ─────────────────────────────────────────
  this.drawDecorativeElements = (x, y, w, h, binIndex, energy) => {
    push();
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const c = this.freqColors[binIndex];

    // Pulsing rings sized by energy
    const maxSize = Math.min(w / 4, h / 4);
    const size = map(energy, 0, 255, 0, maxSize);

    noFill();
    for (let i = 0; i < 3; i++) {
      strokeWeight(map(i, 0, 3, 2, 1));
      stroke(c.r, c.g, c.b, map(i, 0, 3, 120, 60));
      ellipse(centerX, centerY, size - i * 5);
    }

    // Band label (top center)
    textAlign(CENTER, CENTER);
    textSize(28);
    textStyle(BOLD);
    fill(c.r, c.g, c.b, map(energy, 0, 255, 150, 255));
    text(this.frequencyBins[binIndex].toUpperCase(), centerX, y + 20);

    // Numeric energy readout
    textSize(40);
    textStyle(NORMAL);
    fill(200, 200, 200, 200);
    text(Math.round(energy), centerX, centerY - this.dialRadius / 100);
    pop();
  };

  // ─────────────────────────────────────────
  // Needle: maps energy → angle, with layered glow
  // ─────────────────────────────────────────
  this.needle = (energy, centreX, bottomY, binIndex) => {
    push();
    const c = this.freqColors[binIndex];
    translate(centreX, bottomY);

    // Angle within the safe arc
    const theta = map(energy, 0, 255, minAngle, maxAngle);

    // Keep the needle inside the dial: 90% of radius
    const R = this.dialRadius;
    const needleLen = R * 0.9;

    const x = needleLen * cos(theta);
    const y = needleLen * sin(theta);

    // Layered strokes → soft glow
    for (let i = 4; i > 0; i--) {
      strokeWeight(i);
      stroke(c.r, c.g, c.b, map(i, 4, 1, 30, 110));
      line(0, 0, x, y);
    }

    // Foreground needle
    strokeWeight(2);
    stroke(c.r, c.g, c.b);
    line(0, 0, x, y);

    // Tip + hub
    noStroke();
    fill(c.r, c.g, c.b);
    ellipse(x, y, 6);
    fill(255);
    ellipse(0, 0, 6);

    pop();
  };

  // ─────────────────────────────────────────
  // Tick marks + progress arc around the dial
  // ─────────────────────────────────────────
  this.ticks = (centreX, bottomY, binIndex, energy) => {
    push();
    translate(centreX, bottomY);

    const c = this.freqColors[binIndex];
    const alpha = map(energy, 0, 255, 100, 255);
    const safeRadius = this.dialRadius * 1.5;
    let angle = minAngle;

    // Base inner arc (three translucent layers for glow)
    noStroke();
    for (let i = 0; i < 3; i++) {
      fill(c.r, c.g, c.b, map(i, 0, 3, alpha, alpha / 3));
      arc(0, 0, 95 - i * 2, 95 - i * 2, PI, TWO_PI);
    }

    // Outer progress arc: minAngle → current energy angle
    noFill();
    strokeWeight(6);
    stroke(c.r, c.g, c.b, alpha * 1.5);
    arc(
      0, 0,
      this.dialRadius * 3.5, this.dialRadius * 3.5,
      minAngle, map(energy, 0, 255, minAngle, maxAngle)
    );

    // Nine ticks across the arc; brighten those within current energy
    const energyProgress = energy / 255;
    for (let i = 0; i < 9; i++) {
      const tickProgress = i / 8;
      const x  = safeRadius       * cos(angle);
      const x1 = (safeRadius - 5) * cos(angle);
      const y  = safeRadius       * sin(angle);
      const y1 = (safeRadius - 5) * sin(angle);

      // Highlight ticks below current energy
      strokeWeight(tickProgress <= energyProgress ? 2 : 1);
      stroke(
        tickProgress <= energyProgress ? c.r : 200,
        tickProgress <= energyProgress ? c.g : 200,
        tickProgress <= energyProgress ? c.b : 200,
        tickProgress <= energyProgress ? 255 : 120
      );
      line(x, y, x1, y1);

      // Label ends “min” / “max”
      if (i === 0 || i === 8) {
        noStroke();
        fill(200);
        textSize(18);
        textAlign(CENTER, CENTER);
        const labelX = (this.dialRadius + 5) * cos(angle);
        const labelY = (this.dialRadius + 5) * sin(angle);
        text(i === 0 ? "min" : "max", labelX, labelY);
      }

      angle += PI / 10; // step along the arc
    }
    pop();
  };
}