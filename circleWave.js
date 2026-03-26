// CircleWave visualization
// Draws concentric circles that expand, contract, and ripple
// in response to audio energy across different frequency ranges.
// Each ring corresponds to a band (bass → treble).
function CircleWave() {
  this.name = "circlewave";

  // Number of concentric circles to draw
  this.numCircles = 5;

  // Max possible radius of the largest circle (set dynamically)
  this.maxRadius = 0;

  // Rotation angle of the whole visualization (gives slow spinning motion)
  this.rotation = 0;

  // Color scheme for the circles (one per frequency band)
  this.colorScheme = [
    [255, 0, 127],   // Bass (pink)
    [255, 165, 0],   // LowMid (orange)
    [0, 255, 255],   // MidRange (cyan)
    [127, 0, 255],   // HighMid (purple)
    [0, 255, 0]      // Treble (green)
  ];

  // Frequency ranges (FFT indices) mapped to each circle
  this.frequencyRanges = [
    { start: 0, end: 50 },     // Bass
    { start: 51, end: 100 },   // LowMid
    { start: 101, end: 200 },  // MidRange
    { start: 201, end: 300 },  // HighMid
    { start: 301, end: 400 }   // Treble
  ];

  // Handle resizing (so circles scale with canvas size)
  this.onResize = () => {
    this.maxRadius = min(width, height) * 0.4; // scale to 40% of smaller dimension
  };
  this.onResize();

  // Main draw loop
  this.draw = () => {
    push();

    // Get current frequency spectrum
    const spectrum = fourier.analyze();

    // Move origin to center of canvas
    translate(width / 2, height / 2);

    // Slowly rotate whole visualization
    this.rotation += 0.005;
    rotate(this.rotation);

    noStroke();
    const radiusStep = this.maxRadius / this.numCircles; // spacing between rings

    // Loop over each circle (frequency band)
    for (let i = 0; i < this.numCircles; i++) {
      let amplitudeAvg = 0; // average amplitude for this band
      let count = 0;
      const range = this.frequencyRanges[i];

      // Compute average amplitude across this frequency range
      for (let j = range.start; j <= range.end; j++) {
        if (j < spectrum.length) {
          amplitudeAvg += spectrum[j];
          count++;
        }
      }
      if (count > 0) amplitudeAvg /= count;

      // Map amplitude to variation in radius
      const radiusVariation = map(amplitudeAvg, 0, 255, 0, radiusStep * 0.5);
      const radius = (i + 1) * radiusStep + radiusVariation;

      // Alpha transparency increases with loudness
      const alpha = map(amplitudeAvg, 0, 255, 50, 200);

      // Draw the circle
      fill(
        this.colorScheme[i][0],
        this.colorScheme[i][1],
        this.colorScheme[i][2],
        alpha
      );
      ellipse(0, 0, radius * 2);

      // Add ripples if amplitude is above a threshold
      if (amplitudeAvg > 100) {
        // Number of ripples increases with loudness
        const rippleCount = floor(map(amplitudeAvg, 100, 255, 3, 8));
        const rippleAngleStep = TWO_PI / rippleCount;

        for (let r = 0; r < rippleCount; r++) {
          const rippleAngle = r * rippleAngleStep;
          const rippleX = cos(rippleAngle) * radius;
          const rippleY = sin(rippleAngle) * radius;

          // Ripple size also depends on amplitude
          const rippleSize = map(amplitudeAvg, 100, 255, 5, 20);

          ellipse(rippleX, rippleY, rippleSize);
        }
      }
    }

    pop();
  };
}