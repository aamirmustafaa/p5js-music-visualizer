//Constructor function to handle the onscreen menu, keyboard and mouse
//controls
function ControlsAndInput() {
  //playback button displayed in the top left of the screen
  this.playbackButton = new PlaybackButton();

  //volume slider displayed next to the playback button
  this.volumeSlider = new VolumeSlider();

  // track whether the dropdown menu for selecting visualisations
  // currently open. When true, a list of all visuals is rendered
  // below the dropdown button. Clicking outside will close it.
  this.dropdownOpen = false;
  // currently open. When true, a list of all visuals is rendered
  // below the dropdown button. Clicking outside will close it.
  this.dropdownOpen = false;

  // properties for the dropdown button will be computed in draw()
  // and stored here so that mousePressed() can refer to them.
  this.dropdownX = 0;
  this.dropdownY = 0;
  this.dropdownWidth = 0;
  this.dropdownHeight = 0;

  // track whether the dropdown menu for selecting audio tracks is
  // currently open. When true, a list of all audio sources is rendered
  // below the dropdown button. Clicking outside will close it.
  this.trackDropdownOpen = false;

  // properties for the track dropdown button will be computed in draw()
  // and stored here so that mousePressed() can refer to them.
  this.trackDropdownX = 0;
  this.trackDropdownY = 0;
  this.trackDropdownWidth = 120;
  this.trackDropdownHeight = 24;

  //handle mouse clicks on controls and dropdowns
  this.mousePressed = function () {
    // Compute the track selection dropdown's position based on the current
    // position of the volume slider. This allows the button to remain
    // correctly aligned even if the slider or other components change
    // size or position.
    const trackDropdownX = this.volumeSlider.x + this.volumeSlider.width + 40;
    const trackDropdownY = this.volumeSlider.y;

    // First, check if the click is on the playback button. We handle
    // playback interactions first because they affect playing state
    // independent of mode changes. PlaybackButton.hitCheck() will
    // consume the click if it was on the button.
    if (this.playbackButton.hitCheck()) {
      return; // exit since click was handled by the playback button
    }

    // Next, check if the click is on the volume slider. Dragging the
    // slider should not trigger mode changes or full screen toggling.
    if (this.volumeSlider.mousePressed()) {
      return;
    }

    // Check if the click is on the track selection dropdown button. If so,
    // toggle the dropdown open state or select an option if dropdown is open.
    if (
      mouseX >= trackDropdownX &&
      mouseX <= trackDropdownX + this.trackDropdownWidth &&
      mouseY >= trackDropdownY &&
      mouseY <= trackDropdownY + this.trackDropdownHeight
    ) {
      // Clicked on the button itself: toggle the dropdown open state.
      this.trackDropdownOpen = !this.trackDropdownOpen;
      // Close the visualization dropdown if open
      this.dropdownOpen = false;
      return;
    }

    // Handle clicks on track dropdown options when open
    if (this.trackDropdownOpen) {
      const trackOptions = ["track1", "track2", "mic"];
      const trackLabels = ["Track 1", "Track 2", "Microphone"];
      let optionY = trackDropdownY + this.trackDropdownHeight; // first option y coordinate
      const optionHeight = this.trackDropdownHeight; // same height as button

      for (let i = 0; i < trackOptions.length; i++) {
        if (
          mouseX >= trackDropdownX &&
          mouseX <= trackDropdownX + this.trackDropdownWidth &&
          mouseY >= optionY &&
          mouseY <= optionY + optionHeight
        ) {
          // Select the audio mode and close dropdown
          const newMode = trackOptions[i];
          if (audioMode !== newMode) {
            // Remember if something was playing before switching
            const wasPlaying = this.playbackButton.playing;

            audioMode = newMode;

            // stop any currently playing sound or mic when switching modes.
            // reset loadedTrackPath so that the next time the user presses play,
            // the correct file is loaded.
            if (
              sound &&
              typeof sound.isPlaying === "function" &&
              sound.isPlaying()
            ) {
              sound.stop();
            }
            // When switching away from mic mode, ensure the microphone is
            // stopped. p5.AudioIn provides stop() to disable the audio stream.
            if (mic && mic.enabled) {
              try {
                mic.stop();
              } catch (err) {
                // ignore errors if mic hasn't been started yet
              }
            }
            // Reset the global sound reference so a new track can be loaded
            sound = null;
            loadedTrackPath = null;
            // Update playback button state so that the play icon is shown
            this.playbackButton.playing = false;

            // If something was playing before switching, automatically start the new track
            if (wasPlaying) {
              // Use a small delay to ensure the cleanup is complete
              setTimeout(() => {
                this.playbackButton.playAudio();
              }, 50);
            }
          }
          this.trackDropdownOpen = false;
          return;
        }
        optionY += optionHeight;
      }
      // Click outside of options: close dropdown and continue
      this.trackDropdownOpen = false;
    }

    // Compute dropdown button bounds based on the current layout. The
    // dropdown sits to the right of the audio mode button. We reuse
    // previously computed values from draw() if available.
    const dropdownX = this.dropdownX;
    const dropdownY = this.dropdownY;
    const dropdownW = this.dropdownWidth;
    const dropdownH = this.dropdownHeight;

    // Handle clicks on the dropdown button and its options. If the
    // dropdown is open, clicking on a visual name selects it and
    // closes the dropdown. Clicking on the button toggles its open
    // state. Clicking elsewhere closes the dropdown and continues
    // processing other interactions.
    if (
      mouseX >= dropdownX &&
      mouseX <= dropdownX + dropdownW &&
      mouseY >= dropdownY &&
      mouseY <= dropdownY + dropdownH
    ) {
      // Clicked on the button itself: toggle the dropdown open state.
      this.dropdownOpen = !this.dropdownOpen;
      // Close the track dropdown if open
      this.trackDropdownOpen = false;
      return;
    }

    if (this.dropdownOpen) {
      // Determine if the click is on one of the dropdown options.
      let optionY = dropdownY + dropdownH; // first option y coordinate
      const optionHeight = dropdownH; // same height as button
      for (let i = 0; i < vis.visuals.length; i++) {
        if (
          mouseX >= dropdownX &&
          mouseX <= dropdownX + dropdownW &&
          mouseY >= optionY &&
          mouseY <= optionY + optionHeight
        ) {
          // Select the visual and close dropdown
          vis.selectVisual(vis.visuals[i].name);
          this.dropdownOpen = false;
          return;
        }
        optionY += optionHeight;
      }
      // Click outside of options: close dropdown and continue
      this.dropdownOpen = false;
    }
  };

  //responds to keyboard presses
  //@param keycode the ascii code of the keypressed
  this.keyPressed = function () {
    console.log(keyCode);
    // Number key selection functionality removed
  };

  //handle mouse dragging for volume slider
  this.mouseDragged = function () {
    this.volumeSlider.mouseDragged();
  };

  //handle mouse release for volume slider
  this.mouseReleased = function () {
    this.volumeSlider.mouseReleased();
  };

  //draws the playback button and potentially the menu
  this.draw = function () {
    push();
    textAlign(CENTER, CENTER);
    textSize(34);
    fill("white");
    stroke("black");
    strokeWeight(2);

    // playback button
    this.playbackButton.draw();

    // volume slider
    this.volumeSlider.draw();

    // -------------------------------------------------------------------
    // Draw dropdown for selecting audio track/source. The dropdown shows the
    // current audio mode when closed and lists all available sources when open.
    // Compute track dropdown button dimensions
    const trackDropdownX = this.volumeSlider.x + this.volumeSlider.width + 40;
    const trackDropdownY = this.volumeSlider.y;
    const trackDropdownW = this.trackDropdownWidth;
    const trackDropdownH = this.trackDropdownHeight;

    // Store these values for mousePressed()
    this.trackDropdownX = trackDropdownX;
    this.trackDropdownY = trackDropdownY;

    // Draw the track dropdown button background with modern styling
    push();

    // Add subtle shadow effect
    fill(0, 0, 0, 60);
    rect(
      trackDropdownX + 2,
      trackDropdownY + 2,
      trackDropdownW,
      trackDropdownH,
      8
    );

    // Main button with gradient-like effect
    fill(45, 75, 120, 240);
    stroke(80, 130, 180, 150);
    strokeWeight(1);
    rect(trackDropdownX, trackDropdownY, trackDropdownW, trackDropdownH, 8);

    // Subtle inner highlight
    fill(65, 95, 140, 100);
    rect(trackDropdownX + 1, trackDropdownY + 1, trackDropdownW - 2, 3, 6);

    // Draw current selection label with better typography
    fill(255, 255, 255, 245);
    textSize(13);
    textStyle(NORMAL);
    textAlign(LEFT, CENTER);
    let currentLabel;
    if (audioMode === "track1") {
      currentLabel = "Track 1";
    } else if (audioMode === "track2") {
      currentLabel = "Track 2";
    } else {
      currentLabel = "Microphone";
    }
    text(
      currentLabel,
      trackDropdownX + 10,
      trackDropdownY + trackDropdownH / 2
    );

    // Modern dropdown arrow
    textAlign(RIGHT, CENTER);
    fill(200, 220, 255, 200);
    textSize(11);
    text(
      "▾",
      trackDropdownX + trackDropdownW - 10,
      trackDropdownY + trackDropdownH / 2
    );
    pop(); // If track dropdown is open, draw the list of audio sources with enhanced styling
    if (this.trackDropdownOpen) {
      const trackOptions = ["track1", "track2", "mic"];
      const trackLabels = ["Track 1", "Track 2", "Microphone"];
      const optionHeight = trackDropdownH;
      let optionY = trackDropdownY + trackDropdownH;

      // Draw dropdown shadow
      push();
      fill(0, 0, 0, 80);
      rect(
        trackDropdownX + 3,
        optionY + 3,
        trackDropdownW,
        trackOptions.length * optionHeight,
        8
      );
      pop();

      for (let i = 0; i < trackOptions.length; i++) {
        const option = trackOptions[i];
        const label = trackLabels[i];
        push();

        // Determine state and colors
        const isSelected = audioMode === option;
        const isHover =
          mouseX >= trackDropdownX &&
          mouseX <= trackDropdownX + trackDropdownW &&
          mouseY >= optionY &&
          mouseY <= optionY + optionHeight;

        // Enhanced background colors with consistent styling
        if (isHover && !isSelected) {
          // Hover state - consistent blue
          fill(85, 115, 160, 255);
          stroke(105, 135, 180, 150);
          strokeWeight(1);
        } else if (isSelected) {
          // Selected state - slightly darker blue with accent
          fill(60, 90, 140, 255);
          stroke(80, 110, 160, 150);
          strokeWeight(1);
        } else {
          // Normal state - standard blue
          fill(45, 75, 120, 245);
          stroke(65, 95, 140, 120);
          strokeWeight(1);
        }

        // Draw option background
        let cornerRadius = 4;
        if (i === 0 && i === trackOptions.length - 1) {
          // Single item - round all corners
          cornerRadius = 6;
        } else if (i === 0) {
          // First item - we'll handle this specially
          cornerRadius = 0;
        } else if (i === trackOptions.length - 1) {
          // Last item - we'll handle this specially
          cornerRadius = 0;
        } else {
          // Middle items - no rounding
          cornerRadius = 0;
        }

        rect(
          trackDropdownX,
          optionY,
          trackDropdownW,
          optionHeight,
          cornerRadius
        );

        // Inner highlight for depth
        if (isHover || isSelected) {
          fill(255, 255, 255, 30);
          rect(trackDropdownX + 1, optionY + 1, trackDropdownW - 2, 2, 4);
        }

        // Enhanced text styling with shadows
        textSize(13);
        textStyle(NORMAL);
        textAlign(LEFT, CENTER);

        // Text shadow for better readability
        fill(0, 0, 0, 100);
        text(label, trackDropdownX + 10 + 1, optionY + optionHeight / 2 + 1);

        // Main text
        if (isHover && !isSelected) {
          fill(255, 255, 255, 255);
        } else if (isSelected) {
          fill(240, 240, 240, 255);
        } else {
          fill(220, 230, 255, 220);
        }
        text(label, trackDropdownX + 10, optionY + optionHeight / 2);

        // Selected indicator
        if (isSelected) {
          fill(200, 220, 255, 200);
          textAlign(RIGHT, CENTER);
          textSize(12);
          text(
            "✓",
            trackDropdownX + trackDropdownW - 10,
            optionY + optionHeight / 2
          );
        }

        pop();
        optionY += optionHeight;
      }
    }

    // 
    // Draw dropdown for selecting visualisation. The dropdown shows a
    // neutral label when closed and lists all visuals when open. The
    // style complements the track selector for a cohesive UI.
    // Compute dropdown button dimensions
    const dropdownX = trackDropdownX + trackDropdownW + 25;
    const dropdownY = this.volumeSlider.y - 1;
    const dropdownW = 180;
    const dropdownH = 26;
    // Store these values for mousePressed()
    this.dropdownX = dropdownX;
    this.dropdownY = dropdownY;
    this.dropdownWidth = dropdownW;
    this.dropdownHeight = dropdownH;

    // Draw the visualization dropdown button with enhanced modern styling
    push();

    // Add subtle shadow effect
    fill(0, 0, 0, 60);
    rect(dropdownX + 2, dropdownY + 2, dropdownW, dropdownH, 8);

    // Main button with gradient-like effect
    fill(50, 80, 125, 240);
    stroke(85, 135, 185, 150);
    strokeWeight(1);
    rect(dropdownX, dropdownY, dropdownW, dropdownH, 8);

    // Subtle inner highlight
    fill(70, 100, 145, 100);
    rect(dropdownX + 1, dropdownY + 1, dropdownW - 2, 3, 6);

    // Enhanced label and typography
    fill(255, 255, 255, 245);
    textSize(14);
    textStyle(NORMAL);
    textAlign(LEFT, CENTER);

    let buttonLabel;
    if (vis.selectedVisual && vis.selectedVisual.name) {
      buttonLabel = vis.selectedVisual.name;
    } else {
      buttonLabel = "Select Visualization";
    }

    // Clip if too long with better truncation
    const maxLabelChars = 18;
    if (buttonLabel.length > maxLabelChars) {
      buttonLabel = buttonLabel.slice(0, maxLabelChars - 1) + "…";
    }
    text(buttonLabel, dropdownX + 12, dropdownY + dropdownH / 2);

    // Modern dropdown arrow
    textAlign(RIGHT, CENTER);
    fill(200, 220, 255, 200);
    textSize(11);
    text("▾", dropdownX + dropdownW - 12, dropdownY + dropdownH / 2);
    pop();

    // If dropdown is open, draw the list of visuals with enhanced styling
    if (this.dropdownOpen) {
      const optionHeight = dropdownH;
      let optionY = dropdownY + dropdownH;

      // Draw dropdown shadow
      push();
      fill(0, 0, 0, 80);
      rect(
        dropdownX + 3,
        optionY + 3,
        dropdownW,
        vis.visuals.length * optionHeight,
        8
      );
      pop();

      // Determine maximum width for text clipping
      const maxChars = 20;
      for (let i = 0; i < vis.visuals.length; i++) {
        const visualName = vis.visuals[i].name;
        push();

        // Determine state and colors
        const isSelected =
          vis.selectedVisual && vis.selectedVisual.name === visualName;
        const isHover =
          mouseX >= dropdownX &&
          mouseX <= dropdownX + dropdownW &&
          mouseY >= optionY &&
          mouseY <= optionY + optionHeight;

        // Enhanced background colors with consistent styling
        if (isHover && !isSelected) {
          // Hover state - consistent blue
          fill(85, 115, 160, 255);
          stroke(105, 135, 180, 150);
          strokeWeight(1);
        } else if (isSelected) {
          // Selected state - slightly darker blue with accent
          fill(60, 90, 140, 255);
          stroke(80, 110, 160, 150);
          strokeWeight(1);
        } else {
          // Normal state - standard blue
          fill(45, 75, 120, 245);
          stroke(65, 95, 140, 120);
          strokeWeight(1);
        }

        // Draw option background with proper corner rounding
        let cornerRadius = 4;
        if (i === 0 && i === vis.visuals.length - 1) {
          // Single item - round all corners
          cornerRadius = 6;
        } else if (i === 0) {
          // First item - we'll handle this specially
          cornerRadius = 0;
        } else if (i === vis.visuals.length - 1) {
          // Last item - we'll handle this specially
          cornerRadius = 0;
        } else {
          // Middle items - no rounding
          cornerRadius = 0;
        }

        rect(dropdownX, optionY, dropdownW, optionHeight, cornerRadius);

        // Inner highlight for depth
        if (isHover || isSelected) {
          fill(255, 255, 255, 25);
          rect(dropdownX + 1, optionY + 1, dropdownW - 2, 2, 4);
        }

        // Enhanced text styling with shadows
        textSize(14);
        textStyle(NORMAL);
        textAlign(LEFT, CENTER);

        let optName = visualName;
        if (optName.length > maxChars) {
          optName = optName.slice(0, maxChars - 1) + "…";
        }

        // Text shadow for better readability
        fill(0, 0, 0, 100);
        text(optName, dropdownX + 12 + 1, optionY + optionHeight / 2 + 1);

        // Main text
        if (isHover && !isSelected) {
          fill(255, 255, 255, 255);
        } else if (isSelected) {
          fill(240, 240, 240, 255);
        } else {
          fill(220, 230, 255, 220);
        }
        text(optName, dropdownX + 12, optionY + optionHeight / 2);

        // Selected indicator
        if (isSelected) {
          fill(200, 220, 255, 200);
          textAlign(RIGHT, CENTER);
          textSize(12);
          text("✓", dropdownX + dropdownW - 12, optionY + optionHeight / 2);
        }

        pop();
        optionY += optionHeight;
      }
    }

    pop();
  };
}