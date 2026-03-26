// Spectrum visualization
// Draws a drifting particle field as a backdrop, then overlays
// FFT spectrum points that dance along a wavy path.
// Color shifts from red → green depending on amplitude.
function Spectrum(){
    this.name = "spectrum";

    // Floating background particles (soft ambience)
    this.particles = [];
    for (let i = 0; i < 50; i++) {
        this.particles.push({
            x: random(width),
            y: random(height),
            size: random(1, 10),
            speed: random(0.5, 2)
        });
    }

    this.draw = function(){
        
        // 1) Background with fade (semi-transparent black)
        
        noStroke();
        fill(0, 60); // higher alpha = shorter trails
        rect(0, 0, width, height);

        
        // 2) Ambient particles
        
        fill(255, 30); // subtle white glow for ambience
        noStroke();
        for (let p of this.particles) {
            ellipse(p.x, p.y, p.size);

            // Move downward
            p.y += p.speed;

            // Reset to top once off-screen
            if (p.y > height) {
                p.y = 0;
                p.x = random(width);
            }
        }

       
        // 3) Audio spectrum visualization
       
        var spectrum = fourier.analyze();

        // Loop across frequency bins
        for (var i = 0; i < spectrum.length; i++) {
            var x = map(i, 0, spectrum.length, 0, width); // spread bins across width
            var amp = spectrum[i]; // amplitude (0–255)

            // Wavy vertical placement adds life instead of flat baseline
            var y = height / 2 + sin(i * 0.2 + frameCount * 0.05) * amp * 0.5;

            // Scale circle size with amplitude
            var size = map(amp, 0, 255, 2, 20);

            // Color: more red for high amp, more green for low amp
            fill(getRed(amp), getGreen(amp), 0);

            // Plot this frequency as a glowing circle
            ellipse(x, y, size, size);
        }
    };
}


// Helper functions for color mapping

function getGreen(amp) {
    // Higher amplitude → less green
    return 255 - amp;
}

function getRed(amp) {
    // Higher amplitude → more red
    return amp;
}