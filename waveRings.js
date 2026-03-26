// WaveRings visualization
// Concentric rings that “ripple” based on FFT energy in different bands.
// Each ring samples a slice of the spectrum and modulates its radius.
function WaveRings() {
  // Name used by your visualisation registry / selector
  this.name = "waverings";
  
  //  Visual density / motion controls 
  this.numPoints = 200;   // How many vertices to draw around each ring (smoother ↔ heavier)
  this.numRings  = 5;     // Number of concentric rings (maps to the 5 bands below)
  this.maxRadius = 0;     // Computed from canvas size in onResize()
  this.rotation  = 0;     // Slow global rotation (adds life)

  // Angular “history buckets” per ring used for smoothing FFT flicker
  this.radialSegments = 64;

  // Color per ring (bass → treble)
  this.colorScheme = [
    [255,   0, 127],  // Bass (pink)
    [255, 165,   0],  // LowMid (orange)
    [  0, 255, 255],  // MidRange (cyan)
    [127,   0, 255],  // HighMid (purple)
    [  0, 255,   0]   // Treble (green)
  ];

  // FFT index windows that feed each ring’s modulation
  this.frequencyRanges = [
    { start:   0, end:  50 },  // Bass
    { start:  51, end: 100 },  // LowMid 
    { start: 101, end: 200 },  // MidRange
    { start: 201, end: 300 },  // HighMid
    { start: 301, end: 400 }   // Treble
  ]; 
  
  // Smoothing buffer: per-ring array of per-segment averaged amplitudes (0..255)
  // waveHistory[ringIdx][segmentIdx]
  this.waveHistory = Array(this.numRings)
    .fill()
    .map(() => Array(this.radialSegments).fill(0));
  
  // Handle resize so the composition scales with the canvas
  this.onResize = function () {
    // Keep some breathing room by using ~35% of the smaller axis
    this.maxRadius = min(width, height) * 0.35;
  };
  this.onResize();
  
  // ───────── Main draw ─────────
  this.draw = function () {
    push();
    
    // 1) Capture spectrum for this frame (array of 0..255)
    var spectrum = fourier.analyze();
    
    // 2) Center origin and add a slow spin
    translate(width / 2, height / 2);
    this.rotation += 0.002;
    rotate(this.rotation);
    
    // 3) Even spacing for ring baselines
    var radiusStep = this.maxRadius / this.numRings;
    
    // 4) For each ring: update smoothing history, then draw the modulated circle
    for (var i = 0; i < this.numRings; i++) {
      // Stylize this ring
      stroke(this.colorScheme[i][0], this.colorScheme[i][1], this.colorScheme[i][2], 200);
      strokeWeight(2);
      noFill();
      
      // Unmodulated baseline radius for this ring
      var baseRadius = (i + 1) * radiusStep;
      
      // 4a) Update smoothed amplitude history per angular segment
      for (var j = 0; j < this.radialSegments; j++) {
        // Map this segment to a frequency index inside the ring’s window
        var freqStart = this.frequencyRanges[i].start;
        var freqEnd   = this.frequencyRanges[i].end;
        var freqStep  = (freqEnd - freqStart) / this.radialSegments;
        var freqIndex = floor(freqStart + j * freqStep);
        
        // Clamp against spectrum length (mobile or small FFT sizes)
        var amplitude = 0;
        if (freqIndex < spectrum.length) amplitude = spectrum[freqIndex];
        
        // Exponential smoothing: 70% previous, 30% new
        this.waveHistory[i][j] = this.waveHistory[i][j] * 0.7 + amplitude * 0.3;
      }
      
      // 4b) Draw the ring by sampling many angles and looking up the nearest segment
      beginShape();
      for (var k = 0; k <= this.numPoints; k++) {
        // Angle for this vertex (0..2π)
        var angle = map(k, 0, this.numPoints, 0, TWO_PI);

        // Which history segment does this vertex map to?
        var segmentIndex = floor(map(k, 0, this.numPoints, 0, this.radialSegments));
        if (segmentIndex >= this.radialSegments) segmentIndex = 0; // wrap last point

        // Convert smoothed amplitude → how far this vertex pushes outward
        var radiusModulation = map(this.waveHistory[i][segmentIndex], 0, 255, 0, radiusStep * 1.5);

        // Final radius and Cartesian coordinates
        var radius = baseRadius + radiusModulation;
        var x = cos(angle) * radius;
        var y = sin(angle) * radius;
        vertex(x, y);
      }
      endShape(CLOSE);
    }
    
    // 5) Soft global glow for polish (Canvas 2D shadow)
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = 'rgba(255, 255, 255, 0.5)';
    
    // 6) Center pulse that reacts to bass (anchors the composition)
    var bassEnergy = fourier.getEnergy("bass");
    var centerSize = map(bassEnergy, 0, 255, 10, radiusStep * 0.8);
    
    noStroke();
    fill(255, 255, 255, 200);
    ellipse(0, 0, centerSize, centerSize);
    
    pop();
  };
}