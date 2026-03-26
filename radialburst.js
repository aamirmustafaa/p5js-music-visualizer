// RadialBurst visualization
// Draws five animated, spiky rings (bass → treble). Each ring’s
// radius “quivers” with its band energy, creating a starburst look.
function RadialBurst() {
  this.name = "radialburst";

  // Frequency bands to sample from the FFT (p5.Sound named bands)
  this.bands = ["bass", "lowMid", "mid", "highMid", "treble"];

  // Color per band (RGB). Distinct hues = easy visual separation.
  this.colors = [
    [255,  50,  50],   // red       → bass
    [255, 150,  50],   // orange    → lowMid
    [255, 255,  50],   // yellow    → mid
    [ 50, 255, 255],   // cyan      → highMid
    [200, 100, 255]    // violet    → treble
  ];

  // Number of vertices per ring. Higher = smoother circle, more CPU.
  this.numPoints = 100;

  // Main draw loop
  this.draw = function () {
    // Slightly transparent background for a soft trailing effect
    background(0, 60);

    // Refresh spectrum (array 0..255) in case you want extra effects later
    let spectrum = fourier.analyze();

    push();
    // Center the coordinate system; rings radiate from the middle
    translate(width / 2, height / 2);
    noFill(); // rings are outlines; spikes come from radius modulation

    // One ring per band (inner = bass, outer = treble)
    for (let i = 0; i < this.bands.length; i++) {
      // 0..255 loudness of this band
      let energy = fourier.getEnergy(this.bands[i]);

      // Base radius for this band’s circle:
      // evenly spaced from small (bass) to large (treble)
      let radiusBase = map(
        i,
        0, this.bands.length,
        60,
        min(width, height) / 2.8
      );

      // How “spiky” the ring gets (louder → bigger spikes)
      let amplitude = map(energy, 0, 255, 0, 80);

      // Stroke/style for this ring
      stroke(this.colors[i][0], this.colors[i][1], this.colors[i][2], 200);
      strokeWeight(1.5);

      // Build the ring path
      beginShape();
      for (let j = 0; j <= this.numPoints; j++) {
        // Angle around the circle for this vertex
        let angle = map(j, 0, this.numPoints, 0, TWO_PI);

        // Dynamic radius:
        //   - base radius sets ring size
        //   - sin() creates spikes
        //   - angle * i gives each band a unique wobble frequency
        //   - frameCount animates the spikes over time
        let dynamicRadius =
          radiusBase +
          sin(angle * i + frameCount * 0.05) * amplitude;

        // Polar → Cartesian
        let x = cos(angle) * dynamicRadius;
        let y = sin(angle) * dynamicRadius;

        vertex(x, y);
      }
      endShape(CLOSE);
    }

    pop();
  };
}