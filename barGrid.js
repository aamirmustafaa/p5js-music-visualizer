// BarGrid visualization
// Splits the canvas into a grid of cells. Inside each cell, a vertical bar
// grows/shrinks depending on the energy at a mapped frequency band.
// Creates a tiled "equalizer wall" effect.
function BarGrid() {
  this.name = "bargrid";

  // Grid layout configuration
  this.cols = 16;   // number of vertical columns
  this.rows = 8;    // number of horizontal rows
  this.margin = 20; // padding around the edges of the canvas

  // Draw the visualization each frame
  this.draw = function () {
    // Semi-transparent black background for fading trails
    background(0, 60);

    // Get the full frequency spectrum from FFT (array of amplitudes 0..255)
    let spectrum = fourier.analyze();

    // Compute the total drawable grid area
    let gridW = width - 2 * this.margin;
    let gridH = height - 2 * this.margin;

    // Width and height of each grid cell
    let cellW = gridW / this.cols;
    let cellH = gridH / this.rows;

    push();
    // Offset everything so grid sits within margins
    translate(this.margin, this.margin);

    // Loop over each grid cell
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        
        // Choose a spectrum index for this cell
        // Adds a j*0.3 offset so rows don’t all use the same frequencies.
        let index = floor(
          map(i + j * 0.3, 0, this.cols + this.rows, 0, spectrum.length)
        );
        let amp = spectrum[index]; // amplitude at that frequency

        // Bar height is proportional to amplitude
        let barHeight = map(amp, 0, 255, 2, cellH);

        // Position inside the grid
        let x = i * cellW;
        let y = j * cellH + (cellH - barHeight); 
        // (cellH - barHeight) so bars grow upward from bottom of the cell

        // Color logic: hue/brightness based on amplitude
        let hue = map(amp, 0, 255, 200, 360);
        fill(hue, 255, 255); 
        noStroke();

        // Final fill: softer RGB mapping, semi-transparent
        fill(255 - amp, amp * 0.8, 200, 220);

        // Draw the bar inside the cell (slightly narrower for spacing)
        rect(x, y, cellW * 0.8, barHeight, 4); 
        // (rounded corners for aesthetics)
      }
    }

    pop(); // restore drawing state
  };
}