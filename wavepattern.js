// Draw the waveform with layered glow, color gradients, particles,
// optional mirrored reflection, and beat markers.
function WavePattern(){
	// Vis identifier used by your selector/registry
	this.name = "wavepattern";
	
	// State used for smoothing & color
	// Previous frame's waveform samples: we lerp toward the new frame
	// so the line feels fluid instead of jittery.
	this.prevWave = [];
	
	// Palette cycled over time; we interpolate between adjacent entries
	// for a continuous gradient shift (no hard jumps).
	this.colors = [
	  { r: 255, g: 50,  b: 50  }, // red
	  { r: 255, g: 150, b: 50  }, // orange
	  { r: 50,  g: 150, b: 255 }, // blue
	  { r: 200, g: 100, b: 255 }  // purple
	];
	this.colorIndex      = 0;     // current palette index
	this.nextColorIndex  = 1;     // target palette index
	this.colorTransition = 0;     // 0..1 blend factor
	this.colorSpeed      = 0.005; // how fast colors shift
	
	// Mirror toggle: draws an inverted partner curve for symmetry
	this.mirrorEffect = true;
	
	
	// Ambient particle field
	// Adds depth without competing with the waveform.
	this.particles = [];
	for (let i = 0; i < 50; i++) {
	  this.particles.push({
		x: random(width),
		y: random(height),
		size:  random(1, 10),
		speed: random(0.5, 2)
	  });
	}
	
	// Initialize previous wave buffer on first draw
	this.initPrevWave = function() {
	  if (this.prevWave.length === 0) {
		const wave = fourier.waveform(); // array of samples in [-1, 1]
		for (let i = 0; i < wave.length; i++) this.prevWave[i] = 0;
	  }
	};
	
	// Smoothly cycle between palette colors and return the current RGB
	this.updateColors = function() {
	  this.colorTransition += this.colorSpeed;
	  if (this.colorTransition >= 1) {
		this.colorTransition = 0;
		this.colorIndex = this.nextColorIndex;
		this.nextColorIndex = (this.nextColorIndex + 1) % this.colors.length;
	  }
	  const c1 = this.colors[this.colorIndex];
	  const c2 = this.colors[this.nextColorIndex];
	  return {
		r: lerp(c1.r, c2.r, this.colorTransition),
		g: lerp(c1.g, c2.g, this.colorTransition),
		b: lerp(c1.b, c2.b, this.colorTransition)
	  };
	};
	
	// Update + draw the ambient particles, with subtle music-driven motion
	this.updateParticles = function() {
	  push();
	  noStroke();
	  
	  // Use mid-band energy to modulate speed/size a bit
	  const energy = fourier.getEnergy("mid") / 255;
	  
	  for (let i = 0; i < this.particles.length; i++) {
		const p = this.particles[i];
		
		// Drift upward; sway horizontally with a light sine for organic feel
		p.y -= p.speed * (1 + energy);
		p.x += sin(frameCount * 0.02 + i * 0.5) * energy;
		
		// Re-spawn at bottom when off screen
		if (p.y < 0) {
		  p.y = height;
		  p.x = random(width);
		}
		
		// Particles take on the current waveform color to unify the scene
		const col = this.updateColors();
		fill(col.r, col.g, col.b, 100);
		ellipse(p.x, p.y, p.size * (1 + energy), p.size * (1 + energy));
	  }
	  pop();
	};
	
	
	// Main draw
	this.draw = function(){
	  this.initPrevWave();   // ensure smoothing buffer exists
	  this.updateParticles(); // draw the ambience first
	  
	  push();
	  
	  // Current gradient color for this frame
	  const currentColor = this.updateColors();
	  
	  // Band energies used to shape the vertical mapping and micro-motion
	  const bassEnergy   = fourier.getEnergy("bass")   / 255;
	  const midEnergy    = fourier.getEnergy("mid")    / 255;
	  const trebleEnergy = fourier.getEnergy("treble") / 255;
	  
	  // PCM waveform samples ([-1, 1])
	  const wave = fourier.waveform();
	  
	  // ── Background glow “underpainting” (multiple thick translucent strokes)
	  noFill();
	  for (let j = 5; j > 0; j--) {
		strokeWeight(j);
		stroke(currentColor.r, currentColor.g, currentColor.b, 15 * j);
		
		beginShape();
		for (let i = 0; i < wave.length; i += 2) {
		  // Ease prev → current sample (20% blend) to reduce jitter
		  const smoothedValue = lerp(this.prevWave[i], wave[i], 0.2);
		  this.prevWave[i] = smoothedValue;
		  
		  // Map sample to screen: bass extends lower bound, treble raises upper bound
		  const x = map(i, 0, wave.length, 0, width);
		  let   y = map(
			smoothedValue, -1, 1,
			height/2 - 100 - trebleEnergy * 50, // highs lift the top
			height/2 + 100 + bassEnergy   * 50  // lows pull the bottom
		  );
		  
		  // Gentle wobble tied to mid energy for organic motion
		  y += sin(i * 0.05 + frameCount * 0.02) * midEnergy * 20;
		  vertex(x, y);
		}
		endShape();
	  }
	  
	  // ── Foreground waveform: crisp line on top of the glow
	  strokeWeight(2);
	  stroke(currentColor.r, currentColor.g, currentColor.b, 230);
	  
	  beginShape();
	  for (let i = 0; i < wave.length; i += 2) { // step by 2 → fewer verts, better perf
		const smoothedValue = lerp(this.prevWave[i], wave[i], 0.2);
		this.prevWave[i] = smoothedValue;
		
		const x = map(i, 0, wave.length, 0, width);
		let   y = map(
		  smoothedValue, -1, 1,
		  height/2 - 100 - trebleEnergy * 50,
		  height/2 + 100 + bassEnergy   * 50
		);
		y += sin(i * 0.05 + frameCount * 0.02) * midEnergy * 15; // slightly softer than glow
		vertex(x, y);
	  }
	  endShape();
	  
	  // ── Optional mirrored partner curve (inverted mapping + inverted wobble)
	  if (this.mirrorEffect) {
		stroke(currentColor.r, currentColor.g, currentColor.b, 150);
		strokeWeight(1);
		
		beginShape();
		for (let i = 0; i < wave.length; i += 2) {
		  const x = map(i, 0, wave.length, 0, width);
		  let   y = map(
			this.prevWave[i], -1, 1,
			height/2 + 100 + bassEnergy   * 50,
			height/2 - 100 - trebleEnergy * 50
		  );
		  y -= sin(i * 0.05 + frameCount * 0.02) * midEnergy * 15; // inverted wobble
		  vertex(x, y);
		}
		endShape();
	  }
	  
	  // ── Beat markers: short ticks on strong bass hits (visual metronome)
	  if (bassEnergy > 0.7) {
		stroke(255, 255, 255, 200 * bassEnergy);
		strokeWeight(3 * bassEnergy);
		for (let x = 0; x < width; x += width / 10) {
		  line(x, height/2 - 10 * bassEnergy, x, height/2 + 10 * bassEnergy);
		}
	  }
	  
	  pop();
	};
  }