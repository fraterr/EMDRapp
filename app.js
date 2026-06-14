/**
 * EMDR Therapy Session Application
 * Core JavaScript Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  const state = {
    currentScreen: 'screen-welcome',
    initialSuds: null,
    postSuds: null,
    isSubsequentSet: false,
    sensoryData: {
      images: '',
      sounds: '',
      noises: '',
      tactile: '',
      tastes: '',
      smells: ''
    },
    // Bilateral stimulation config
    stimulation: {
      startTime: 0,
      durationMs: 90000, // 1.5 minutes
      animationFrameId: null,
      baseSpeed: 3, // 1 to 5
      variationMode: 'dynamic', // dynamic, wave, constant
      soundEnabled: true,
      isRunning: false
    },
    history: [],
    // TFT Tapping state
    tft: {
      activePointIndex: 0,
      tapCount: 0,
      isPlaying: false,
      intervalId: null,
      pulseIntervalMs: 650
    },
    // NLP state
    nlp: {
      currentState: 'color'
    },
    advancedMode: false
  };

  // --- SCREEN FLOW DEFINITION ---
  const screenSequence = [
    'screen-welcome',
    'screen-recall',
    'screen-initial-suds',
    'screen-sensory-images',
    'screen-sensory-sounds',
    'screen-sensory-tactile',
    'screen-sensory-tastes',
    'screen-sensory-smells',
    'screen-tft-focus',
    'screen-eft-tapping',
    'screen-9-gamut',
    'screen-stimulation', // Absolute overlay screen
    'screen-deep-breath',
    'screen-nlp',
    'screen-post-suds',
    'screen-summary',
    'screen-finish'
  ];

  // Map screens to progress percentages (0 - 100)
  const screenProgress = {
    'screen-welcome': 5,
    'screen-recall': 12,
    'screen-initial-suds': 20,
    'screen-sensory-images': 28,
    'screen-sensory-sounds': 36,
    'screen-sensory-tactile': 44,
    'screen-sensory-tastes': 50,
    'screen-sensory-smells': 56,
    'screen-tft-focus': 62,
    'screen-eft-tapping': 70,
    'screen-9-gamut': 75,
    'screen-stimulation': 80,
    'screen-deep-breath': 88,
    'screen-nlp': 94,
    'screen-post-suds': 97,
    'screen-summary': 99,
    'screen-finish': 100
  };

  // --- AUDIO SYNTHESIZER ---
  function playTherapeuticChime() {
    if (state.stimulation.soundEnabled === false) return;
    
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      
      const audioCtx = new AudioContextClass();
      const playTone = (freq, startOffset, duration, volume = 0.15) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startOffset);
        
        // Soothing attack and decay
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + startOffset);
        gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + startOffset + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + startOffset + duration);
        
        osc.start(audioCtx.currentTime + startOffset);
        osc.stop(audioCtx.currentTime + startOffset + duration);
      };
      
      // Calming high bell chime: C6 (1046.5Hz) followed by E6 (1318.5Hz)
      playTone(1046.5, 0, 1.8, 0.12);
      playTone(1318.5, 0.08, 1.5, 0.10);
    } catch (e) {
      console.warn("Audio Context failed to initialize: ", e);
    }
  }

  // --- SCREEN NAVIGATION CONTROLLER ---
  function showScreen(screenId) {
    // Hide all screens
    const allScreens = document.querySelectorAll('.screen, .screen-stimulation');
    allScreens.forEach(scr => {
      scr.classList.remove('active');
      scr.style.display = 'none';
    });

    // Special handling for the absolute black stimulation screen
    const mainHeader = document.getElementById('app-header');
    const mainWrapper = document.getElementById('app-interface-wrapper');
    
    if (screenId === 'screen-stimulation') {
      mainHeader.style.opacity = '0';
      mainHeader.style.pointerEvents = 'none';
      if (mainWrapper) mainWrapper.style.display = 'none';
      
      const stimScreen = document.getElementById('screen-stimulation');
      stimScreen.style.display = 'flex';
      // Force repaint
      stimScreen.offsetHeight;
      stimScreen.classList.add('active');
    } else {
      mainHeader.style.opacity = '1';
      mainHeader.style.pointerEvents = 'all';
      if (mainWrapper) mainWrapper.style.display = 'block';
      
      const targetScreen = document.getElementById(screenId);
      if (targetScreen) {
        targetScreen.style.display = 'block';
        // Force repaint
        targetScreen.offsetHeight;
        targetScreen.classList.add('active');
      }
    }

    state.currentScreen = screenId;
    
    // Update progress bar
    const progressFill = document.getElementById('session-progress');
    if (progressFill && screenProgress[screenId] !== undefined) {
      progressFill.style.width = `${screenProgress[screenId]}%`;
    }

    // Custom initializations for specific screens
    if (screenId === 'screen-recall') {
      startBreathingGuide();
      // Customize prompt based on whether it is a repeated set
      const recallTitle = document.querySelector('#screen-recall h2');
      const recallDesc = document.querySelector('#screen-recall p.description');
      if (state.isSubsequentSet) {
        if (recallTitle) recallTitle.textContent = "Refocus on the Memory";
        if (recallDesc) recallDesc.textContent = "Take a moment to bring the trauma memory back into focus. Observe whatever remains, noticing any changes in your feelings, thoughts, or physical body.";
      } else {
        if (recallTitle) recallTitle.textContent = "Bring the Memory to Mind";
        if (recallDesc) recallDesc.textContent = "Close your eyes or focus on the screen. Bring the distressing or traumatic memory to your awareness. Allow the thoughts, feelings, and body sensations associated with this event to arise.";
      }
    } else {
      stopBreathingGuide();
    }

    if (screenId === 'screen-tft-focus') {
      const tftNextBtn = document.getElementById('btn-tft-focus-next');
      if (tftNextBtn) {
        if (!state.advancedMode && !state.isSubsequentSet && state.initialSuds === null) {
          tftNextBtn.textContent = "Evaluate Distress";
        } else {
          tftNextBtn.textContent = "Continue to Tapping";
        }
      }
    }

    if (screenId === 'screen-eft-tapping') {
      startEftTapping();
    } else {
      stopEftTapping();
    }

    if (screenId === 'screen-nlp') {
      // Reset NLP state
      state.nlp.currentState = 'color';
      
      const nlpInstruction = document.getElementById('nlp-instruction');
      if (nlpInstruction) {
        nlpInstruction.textContent = "Bring the distressing scene back into your mind's eye. Using your own mental imagination, visualize the scene and mentally transform it, stripping away all colors until it is completely black and white.";
      }

      const projection = document.getElementById('nlp-memory-projection');
      if (projection) {
        projection.style.display = 'flex';
        projection.classList.remove('grayscale-fade', 'shrink-to-rice');
      }

      // Restart the scene animation cleanly
      const scene = document.getElementById('nlp-memory-scene');
      if (scene) {
        scene.style.display = 'block';
        scene.style.opacity = '1';
        scene.classList.remove('scene-shrinking', 'scene-erasing');
        scene.style.animation = 'none';
        scene.offsetHeight; // force reflow
        scene.style.animation = '';
      }

      const viewBox = document.getElementById('nlp-view-box');
      if (viewBox) {
        viewBox.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
      }

      const stepBtn = document.getElementById('btn-nlp-next-step');
      if (stepBtn) {
        stepBtn.style.display = 'block';
        stepBtn.textContent = "I have turned it Black & White";
      }

      const navButtons = document.getElementById('nlp-navigation-buttons');
      if (navButtons) {
        navButtons.style.display = 'none';
      }

      const eraser = document.getElementById('nlp-eraser-indicator');
      if (eraser) {
        eraser.style.display = 'none';
        eraser.classList.remove('auto-sweep');
      }

      setupNlpCanvas();
    } else {
      if (nlpAnimationId) {
        cancelAnimationFrame(nlpAnimationId);
        nlpAnimationId = null;
      }
    }

    if (screenId === 'screen-deep-breath') {
      startDeepBreathGuide();
    } else {
      stopDeepBreathGuide();
    }

    if (screenId === 'screen-summary') {
      const beforeVal = document.getElementById('summary-before');
      const afterVal = document.getElementById('summary-after');
      if (beforeVal) beforeVal.textContent = state.initialSuds;
      if (afterVal) afterVal.textContent = state.postSuds;

      const feedbackText = document.getElementById('summary-text-feedback');
      if (feedbackText) {
        const drop = state.initialSuds - state.postSuds;
        if (drop > 0) {
          feedbackText.textContent = `Great progress! Your distress intensity has reduced by ${drop} point(s) (from ${state.initialSuds} down to ${state.postSuds}). Would you like to do another set of eye-movements to reduce it even further?`;
        } else if (drop === 0) {
          feedbackText.textContent = `Your distress intensity is currently stable at ${state.postSuds}/10. EMDR processing often requires multiple rounds to begin shifting. Would you like to do another set?`;
        } else {
          feedbackText.textContent = `Your distress is rated at ${state.postSuds}/10. Sometimes, bringing details to mind temporarily increases awareness of the distress before it starts decreasing. This is a normal part of processing. Would you like to perform another set?`;
        }
      }
    }

    if (screenId === 'screen-finish') {
      saveSessionToHistory();
      renderHistoryList();
    }
  }

  // --- BREATHING GUIDE SYNCHRONIZER ---
  let breathInterval = null;
  function startBreathingGuide() {
    const statusText = document.getElementById('breath-status');
    if (!statusText) return;
    
    let cycle = 0; // 0 = Inhale, 1 = Hold, 2 = Exhale, 3 = Hold (4s cycles)
    statusText.textContent = "Inhale";
    
    if (breathInterval) clearInterval(breathInterval);
    breathInterval = setInterval(() => {
      cycle = (cycle + 1) % 2; // Simple 2-phase for the CSS breath-circle
      if (cycle === 0) {
        statusText.textContent = "Inhale";
      } else {
        statusText.textContent = "Exhale";
      }
    }, 4000); // Toggles every 4 seconds to match the 8-second CSS animation cycle
  }

  function stopBreathingGuide() {
    if (breathInterval) {
      clearInterval(breathInterval);
      breathInterval = null;
    }
  }

  // --- DEEP BREATH GUIDE SYNCHRONIZER (4-4-8 cycle) ---
  let deepBreathTimer = null;
  function startDeepBreathGuide() {
    const statusText = document.getElementById('deep-breath-status');
    if (!statusText) return;
    
    let seconds = 0;
    statusText.textContent = "Inhale";
    
    if (deepBreathTimer) clearInterval(deepBreathTimer);
    deepBreathTimer = setInterval(() => {
      seconds = (seconds + 1) % 16;
      if (seconds === 0) {
        statusText.textContent = "Inhale";
      } else if (seconds === 4) {
        statusText.textContent = "Hold";
      } else if (seconds === 8) {
        statusText.textContent = "Exhale";
      }
    }, 1000);
  }

  function stopDeepBreathGuide() {
    if (deepBreathTimer) {
      clearInterval(deepBreathTimer);
      deepBreathTimer = null;
    }
  }

  // --- SUDS RATING BUTTONS EVENT INITIALIZATION ---
  function setupSudsButtons(gridId, nextBtnId, indicatorId, type) {
    const grid = document.getElementById(gridId);
    const nextBtn = document.getElementById(nextBtnId);
    const indicator = document.getElementById(indicatorId);
    
    if (!grid || !nextBtn || !indicator) return;

    // Define qualitative distress labels
    const sudsLabels = {
      1: "1 - Alert & peaceful; no distress.",
      2: "2 - Minimal; barely noticeable discomfort.",
      3: "3 - Mild; slightly uncomfortable but easy to ignore.",
      4: "4 - Moderate; light distress, noticeable but manageable.",
      5: "5 - Moderate; clear distress, starting to feel heavy.",
      6: "6 - Moderate-Strong; unpleasant, thoughts are disruptive.",
      7: "7 - Strong; highly uncomfortable, hard to focus on other things.",
      8: "8 - Severe; intense emotional pain, body feels tense.",
      9: "9 - Very Severe; extremely overwhelming, close to panic.",
      10: "10 - Highest Distress; absolute maximum pain imaginable."
    };

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.suds-btn');
      if (!btn) return;

      // Select active rating
      grid.querySelectorAll('.suds-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      const value = parseInt(btn.dataset.value, 10);
      if (type === 'initial') {
        state.initialSuds = value;
      } else {
        state.postSuds = value;
      }

      // Update indicator text and color
      indicator.textContent = sudsLabels[value];
      
      // Color code text based on SUDS level
      if (value <= 2) indicator.style.color = 'var(--suds-1-2)';
      else if (value <= 4) indicator.style.color = 'var(--suds-3-4)';
      else if (value <= 6) indicator.style.color = 'var(--suds-5-6)';
      else if (value <= 8) indicator.style.color = 'var(--suds-7-8)';
      else indicator.style.color = 'var(--suds-9-10)';

      // Enable next step button
      nextBtn.disabled = false;
    });
  }

  setupSudsButtons('initial-suds-grid', 'btn-initial-suds-next', 'initial-suds-indicator', 'initial');
  setupSudsButtons('post-suds-grid', 'btn-post-suds-next', 'post-suds-indicator', 'post');

  // --- EFT TAPPING ENGINE & CONSTANTS ---
  const eftPoints = [
    { id: 'kc', name: 'Karate Chop (KC)', desc: 'Tap the outer edge of your hand, in the fleshy part below the pinky finger.', img: 'assets/EFT points/karate chop.jpg' },
    { id: 'th', name: 'Top of Head (TH)', desc: 'Tap the crown / center of the top of your head with your fingertips.', img: 'assets/EFT points/Top head.jpg' },
    { id: 'eb', name: 'Eyebrow (EB)', desc: 'Tap the inner edge of your eyebrows, near where they meet the bridge of your nose.', img: 'assets/EFT points/eyebrows.jpg' },
    { id: 'se', name: 'Side of Eye (SE)', desc: 'Tap the bone at the outer side of your eyes, near the temple.', img: 'assets/EFT points/side eye.jpg' },
    { id: 'ue', name: 'Under Eye (UE)', desc: 'Tap the bone directly under your eyes, centered beneath your pupil.', img: 'assets/EFT points/under eye.jpg' },
    { id: 'un', name: 'Under Nose (UN)', desc: 'Tap the small crease between the bottom of your nose and your upper lip.', img: 'assets/EFT points/under nose.jpg' },
    { id: 'ch', name: 'Chin Point (Ch)', desc: 'Tap the horizontal crease between your lower lip and the point of your chin.', img: 'assets/EFT points/chin point.jpg' },
    { id: 'cb', name: 'Collarbone (CB)', desc: 'Tap about one inch down and out from the U-shaped notch at the base of your throat.', img: 'assets/EFT points/collarbone.jpg' },
    { id: 'ua', name: 'Under Arm (UA)', desc: 'Tap about four inches below your armpit, on the side of your body (at bra-strap height).', img: 'assets/EFT points/under arm.jpg' }
  ];

  function selectTappingPoint(pointId) {
    const pIdx = eftPoints.findIndex(p => p.id === pointId);
    if (pIdx === -1) return;
    
    state.tft.activePointIndex = pIdx;
    
    // Update active illustration image with a quick fade transition
    const point = eftPoints[pIdx];
    const imgEl = document.getElementById('tapping-point-image');
    if (imgEl) {
      imgEl.style.opacity = '0';
      setTimeout(() => {
        imgEl.src = point.img;
        imgEl.alt = point.name;
        imgEl.style.opacity = '1';
      }, 120);
    }
    
    // Update details panel text
    const nameEl = document.getElementById('tapping-point-name');
    const descEl = document.getElementById('tapping-point-desc');
    if (nameEl) nameEl.textContent = point.name;
    if (descEl) descEl.textContent = point.desc;
    
    // Update sequence list highlights
    const listItems = document.querySelectorAll('.seq-item');
    listItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.pointId === pointId) {
        item.classList.add('active');
      }
    });
  }

  function startEftTapping() {
    selectTappingPoint('kc');
  }

  // Obsolete - kept for layout compatibility
  function stopEftTapping() {
  }

  // Bind the sequence checklist item hover and click events
  function initTappingListListeners() {
    const listItems = document.querySelectorAll('.seq-item');
    listItems.forEach(item => {
      item.addEventListener('click', () => {
        selectTappingPoint(item.dataset.pointId);
      });
      item.addEventListener('mouseenter', () => {
        selectTappingPoint(item.dataset.pointId);
      });
    });
  }

  // --- NLP SUBMODALITIES ENGINE ---
  let nlpCtx = null;
  let nlpAnimationId = null;
  const nlpParticles = [];
  const nlpStars = [];

  class NlpParticle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 5;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.radius = 1 + Math.random() * 3;
      this.color = `hsla(${200 + Math.random() * 80}, 90%, 70%, ${0.7 + Math.random() * 0.3})`;
      this.alpha = 1;
      this.decay = 0.01 + Math.random() * 0.02;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.decay;
    }
    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.restore();
    }
  }

  class NlpStar {
    constructor(width, height) {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.radius = 0.5 + Math.random() * 1.5;
      this.alpha = 0.1 + Math.random() * 0.8;
      this.speed = 0.005 + Math.random() * 0.015;
      this.glow = Math.random() > 0.5;
    }
    update() {
      this.alpha += this.speed;
      if (this.alpha > 0.95 || this.alpha < 0.05) {
        this.speed = -this.speed;
      }
    }
    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      if (this.glow) {
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#ffffff';
      }
      ctx.fill();
      ctx.restore();
    }
  }

  function setupNlpCanvas() {
    const canvas = document.getElementById('nlp-canvas');
    if (!canvas) return;
    
    nlpCtx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    nlpStars.length = 0;
    for (let i = 0; i < 40; i++) {
      nlpStars.push(new NlpStar(canvas.width, canvas.height));
    }
    
    nlpParticles.length = 0;
    
    if (nlpAnimationId) {
      cancelAnimationFrame(nlpAnimationId);
    }
    
    animateNlpCanvas();
  }

  function animateNlpCanvas() {
    if (!nlpCtx) return;
    
    const canvas = document.getElementById('nlp-canvas');
    if (!canvas) return;
    
    nlpCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (state.nlp.currentState === 'void' || state.nlp.currentState === 'erase') {
      nlpStars.forEach(star => {
        star.update();
        star.draw(nlpCtx);
      });
    }
    
    for (let i = nlpParticles.length - 1; i >= 0; i--) {
      const p = nlpParticles[i];
      p.update();
      if (p.alpha <= 0) {
        nlpParticles.splice(i, 1);
      } else {
        p.draw(nlpCtx);
      }
    }
    
    nlpAnimationId = requestAnimationFrame(animateNlpCanvas);
  }

  function initNlpListeners() {
    const canvas = document.getElementById('nlp-canvas');
    const viewBox = document.getElementById('nlp-view-box');
    const eraser = document.getElementById('nlp-eraser-indicator');
    
    if (!canvas || !viewBox || !eraser) return;
    
    const handleMove = (e) => {
      if (state.nlp.currentState !== 'erase') return;
      
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;
      
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      eraser.style.left = `${x}px`;
      eraser.style.top = `${y}px`;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const dist = Math.hypot(x - centerX, y - centerY);
      
      if (dist < 18) {
        triggerNlpErasure(centerX, centerY);
      }
    };
    
    viewBox.addEventListener('mouseenter', () => {
      if (state.nlp.currentState === 'erase') {
        eraser.style.display = 'flex';
      }
    });
    
    viewBox.addEventListener('mouseleave', () => {
      eraser.style.display = 'none';
    });
    
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove, { passive: true });
    
    canvas.addEventListener('touchstart', (e) => {
      if (state.nlp.currentState === 'erase') {
        eraser.style.display = 'flex';
        handleMove(e);
      }
    }, { passive: true });
  }

  function triggerNlpErasure(cx, cy) {
    state.nlp.currentState = 'void';
    
    const projection = document.getElementById('nlp-memory-projection');
    const eraser = document.getElementById('nlp-eraser-indicator');
    if (projection) projection.style.display = 'none';
    if (eraser) eraser.style.display = 'none';
    
    playTherapeuticChime();
    
    for (let i = 0; i < 70; i++) {
      nlpParticles.push(new NlpParticle(cx, cy));
    }
    
    const nlpInstruction = document.getElementById('nlp-instruction');
    if (nlpInstruction) {
      nlpInstruction.textContent = "The image is dissolved. Only an infinite, peaceful space remains. Rest in this calm void.";
    }
    
    const viewBox = document.getElementById('nlp-view-box');
    if (viewBox) {
      viewBox.style.backgroundColor = '#000000';
    }
    
    setTimeout(() => {
      const navButtons = document.getElementById('nlp-navigation-buttons');
      if (navButtons) {
        navButtons.style.display = 'flex';
      }
    }, 2500);
  }

  // --- INPUT RETRIEVAL SYSTEM ---
  function captureSensoryData() {
    state.sensoryData.images = document.getElementById('input-images').value.trim();
    state.sensoryData.sounds = document.getElementById('input-sounds').value.trim();
    state.sensoryData.tactile = document.getElementById('input-tactile').value.trim();
    state.sensoryData.tastes = document.getElementById('input-tastes').value.trim();
    state.sensoryData.smells = document.getElementById('input-smells').value.trim();
  }

  function resetSensoryInputs() {
    document.getElementById('input-images').value = '';
    document.getElementById('input-sounds').value = '';
    document.getElementById('input-tactile').value = '';
    document.getElementById('input-tastes').value = '';
    document.getElementById('input-smells').value = '';
    state.sensoryData = { images: '', sounds: '', noises: '', tactile: '', tastes: '', smells: '' };
  }

  // --- BILATERAL STIMULATION EYE-TRACKING ENGINE ---
  function startBilateralStimulation() {
    const overlay = document.getElementById('stim-instruction-overlay');
    const instructionContent = document.getElementById('stim-instruction-content');
    const countdownEl = document.getElementById('stim-countdown');
    const startCountdownBtn = document.getElementById('btn-start-countdown');
    const pointerContainer = document.getElementById('emdr-pointer-container');
    const progressBar = document.getElementById('stim-progress-bar');
    
    if (!pointerContainer) return;

    // Show overlay and prepare countdown
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.style.opacity = '1';
      pointerContainer.style.opacity = '0'; // hide pointer during countdown
      
      if (instructionContent) instructionContent.style.display = 'block';
      if (countdownEl) countdownEl.style.display = 'none';

      const startAction = () => {
        if (startCountdownBtn) startCountdownBtn.removeEventListener('click', startAction);
        
        if (instructionContent) instructionContent.style.display = 'none';
        if (countdownEl) {
          countdownEl.style.display = 'block';
          
          let count = 3;
          countdownEl.textContent = count;
          
          const countInterval = setInterval(() => {
            count--;
            if (count > 0) {
              countdownEl.textContent = count;
            } else if (count === 0) {
              countdownEl.textContent = "Start";
            } else {
              clearInterval(countInterval);
              overlay.style.opacity = '0';
              setTimeout(() => {
                overlay.style.display = 'none';
                pointerContainer.style.opacity = '1';
                beginStimulationAnimation(pointerContainer, progressBar);
              }, 500); // Wait for fade out
            }
          }, 1000);
        } else {
          overlay.style.display = 'none';
          pointerContainer.style.opacity = '1';
          beginStimulationAnimation(pointerContainer, progressBar);
        }
      };

      if (startCountdownBtn) {
        // Replace node to clean up any old listeners
        startCountdownBtn.replaceWith(startCountdownBtn.cloneNode(true));
        const freshBtn = document.getElementById('btn-start-countdown');
        freshBtn.addEventListener('click', startAction);
      } else {
        // fallback if button isn't found
        beginStimulationAnimation(pointerContainer, progressBar);
      }
    } else {
      beginStimulationAnimation(pointerContainer, progressBar);
    }
  }

  function beginStimulationAnimation(pointerContainer, progressBar) {
    // Play starting chime
    playTherapeuticChime();

    // Load user settings (defaults since prep screen was removed)
    const speedRangeVal = 4.5;
    const variationMode = 'dynamic';
    const soundSetting = 'enabled';
    
    state.stimulation.baseSpeed = speedRangeVal;
    state.stimulation.variationMode = variationMode;
    state.stimulation.soundEnabled = (soundSetting === 'enabled');
    
    state.stimulation.isRunning = true;
    state.stimulation.startTime = performance.now();

    // Reset pointer container scale/style
    pointerContainer.style.left = '50%';
    pointerContainer.style.top = '50%';

    // Animation physics variables
    let angle = 0; // Tracks the phase of the sinusoidal oscillation (sin(angle) goes from -1 to 1)
    let prevSin = 0; // Tracks previous sine value to detect center crossings
    let theta = 0; // Current diagonal trajectory angle in radians (0 is horizontal)
    const screenPadding = 60; // Keep the finger icon inside the screen edges

    function updateFrame(timestamp) {
      if (!state.stimulation.isRunning) return;

      const elapsed = timestamp - state.stimulation.startTime;
      const progressFactor = Math.min(elapsed / state.stimulation.durationMs, 1);

      // Update progress bar
      if (progressBar) {
        progressBar.style.width = `${progressFactor * 100}%`;
      }

      // Check for timeout
      if (progressFactor >= 1) {
        stopBilateralStimulation(false); // Finished naturally
        return;
      }

      // Dynamic Speed Calculation
      // Base frequency of eye movement oscillations (rad per millisecond)
      // speedRangeVal goes from 1 (slow, ~0.3 Hz) to 5 (fast, ~1.2 Hz)
      let baseFrequency = 0.0015 + (speedRangeVal * 0.0007);
      
      let currentFrequency = baseFrequency;
      
      if (variationMode === 'dynamic') {
        // Slowly oscillate the frequency over time (30 second period) and add fine random jitter
        const scale = 1 + 0.35 * Math.sin(timestamp * 0.0002) + (Math.random() * 0.05 - 0.025);
        currentFrequency = baseFrequency * scale;
      } else if (variationMode === 'wave') {
        // Smooth swell pattern (accelerating and decelerating over a 12 second cycle)
        const scale = 1 + 0.5 * Math.sin(timestamp * 0.0005);
        currentFrequency = baseFrequency * scale;
      }

      // Ramp up speed slowly over the first 3 seconds
      const rampDuration = 3000;
      if (elapsed < rampDuration) {
        const rampProgress = elapsed / rampDuration;
        // Start at 0.15x speed, linearly ramp up to 1.0x
        currentFrequency *= (0.15 + 0.85 * rampProgress);
      }

      // Angle step increment per frame based on current frequency
      // Using deltaTime to prevent frame-rate physics dependency
      angle += currentFrequency * 16.67; // Approx 60fps frame delta

      const currentSin = Math.sin(angle);

      // Detect center crossing (sign change of sine, when finger passes the center of the screen)
      // We check prevSin !== 0 to prevent a double trigger or trigger on the first frame.
      if (Math.sign(currentSin) !== Math.sign(prevSin) && prevSin !== 0) {
        // Choose a new random diagonal angle. 
        // We limit theta to [-Math.PI / 3, Math.PI / 3] to keep a prominent horizontal 
        // tracking component (lateral desensitization), which is the standard for EMDR,
        // while introducing dynamic diagonal variations.
        theta = (Math.random() * 2 - 1) * (Math.PI / 3);
      }
      prevSin = currentSin;

      // Position along the diagonal axis defined by theta
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      const minX = screenPadding;
      const maxX = screenWidth - screenPadding - 160; // subtracting finger width (160px)
      const minY = screenPadding;
      const maxY = screenHeight - screenPadding - 160; // subtracting finger height (160px)

      // Safe bounds to prevent negative ranges on tiny viewports
      const safeMaxX = Math.max(maxX, minX + 10);
      const safeMaxY = Math.max(maxY, minY + 10);

      const centerX = minX + (safeMaxX - minX) / 2;
      const centerY = minY + (safeMaxY - minY) / 2;

      const rangeX = (safeMaxX - minX) / 2;
      const rangeY = (safeMaxY - minY) / 2;

      // factor oscillates smoothly between -1 and 1
      const factor = currentSin;

      const targetX = centerX + rangeX * factor * Math.cos(theta);
      const targetY = centerY + rangeY * factor * Math.sin(theta);

      pointerContainer.style.left = `${targetX}px`;
      pointerContainer.style.top = `${targetY}px`;

      state.stimulation.animationFrameId = requestAnimationFrame(updateFrame);
    }

    state.stimulation.animationFrameId = requestAnimationFrame(updateFrame);
  }

  function stopBilateralStimulation(wasSkipped = false) {
    state.stimulation.isRunning = false;
    
    if (state.stimulation.animationFrameId) {
      cancelAnimationFrame(state.stimulation.animationFrameId);
      state.stimulation.animationFrameId = null;
    }

    // Play final chime
    playTherapeuticChime();

    // Transition to deep breath screen
    setTimeout(() => {
      showScreen('screen-deep-breath');
    }, 600);
  }

  // Handle manual stimulation skip/completion
  const stimScreen = document.getElementById('screen-stimulation');
  if (stimScreen) {
    stimScreen.addEventListener('click', () => {
      if (state.stimulation.isRunning) {
        stopBilateralStimulation(true);
      }
    });
  }

  // --- LOCALSTORAGE LOGS & STATISTICS ---
  function saveSessionToHistory() {
    if (state.initialSuds === null || state.postSuds === null) return;

    const sessionRecord = {
      date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      initial: state.initialSuds,
      final: state.postSuds,
      reduction: Math.max(state.initialSuds - state.postSuds, 0),
      images: state.sensoryData.images
    };

    // Load from localStorage
    try {
      const stored = localStorage.getItem('emdr_session_history');
      let historyArray = stored ? JSON.parse(stored) : [];
      
      // Limit local history to 20 items
      historyArray.unshift(sessionRecord);
      if (historyArray.length > 20) {
        historyArray = historyArray.slice(0, 20);
      }

      localStorage.setItem('emdr_session_history', JSON.stringify(historyArray));
      state.history = historyArray;
    } catch (e) {
      console.error("Could not write history to localStorage: ", e);
    }
  }

  function renderHistoryList() {
    const listEl = document.getElementById('history-log-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    // Load history
    let historyArray = [];
    try {
      const stored = localStorage.getItem('emdr_session_history');
      historyArray = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error(e);
    }

    // Call chart renderer
    renderHistoryChart();

    if (historyArray.length === 0) {
      listEl.innerHTML = '<div class="history-empty">No logged sessions yet. Completed sessions will show up here.</div>';
      return;
    }

    historyArray.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';

      const detailsDiv = document.createElement('div');
      
      const dateSpan = document.createElement('div');
      dateSpan.className = 'history-date';
      dateSpan.textContent = item.date;
      
      const descSpan = document.createElement('div');
      descSpan.style.fontSize = '0.8rem';
      descSpan.style.color = 'rgba(255, 255, 255, 0.4)';
      
      // Display truncated visual memory if recorded
      let memo = item.images || 'General Processing';
      if (memo.length > 35) memo = memo.substring(0, 32) + '...';
      descSpan.textContent = `Memory focus: "${memo}"`;

      detailsDiv.appendChild(dateSpan);
      detailsDiv.appendChild(descSpan);

      const changeSpan = document.createElement('div');
      changeSpan.className = 'history-change';
      
      const changeVal = item.initial - item.final;
      if (changeVal > 0) {
        changeSpan.className += ' history-change-reduced';
        changeSpan.innerHTML = `Reduced by ${changeVal} (${item.initial} → ${item.final})`;
      } else {
        changeSpan.innerHTML = `Maintained (${item.initial} → ${item.final})`;
      }

      div.appendChild(detailsDiv);
      div.appendChild(changeSpan);
      listEl.appendChild(div);
    });
  }

  function renderHistoryChart() {
    const chartContainer = document.getElementById('history-chart-container');
    if (!chartContainer) return;

    // Load history
    let historyArray = [];
    try {
      const stored = localStorage.getItem('emdr_session_history');
      historyArray = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error(e);
    }

    if (historyArray.length === 0) {
      chartContainer.style.display = 'none';
      return;
    }

    chartContainer.style.display = 'flex';

    // Reverse history to show chronological order (oldest to newest)
    const reversedHistory = [...historyArray].reverse();
    const total = reversedHistory.length;

    // SVG Settings
    const svgWidth = 500;
    const svgHeight = 160;
    const padding = { top: 20, right: 20, bottom: 20, left: 30 };
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    // Coordinate mapping functions
    const getY = (val) => {
      // Map scale 1-10 to Y pixel coords (10 is top, 1 is bottom)
      return padding.top + ((10 - val) * chartHeight / 9);
    };

    const getX = (idx) => {
      if (total <= 1) {
        return padding.left + chartWidth / 2;
      }
      return padding.left + (idx * chartWidth / (total - 1));
    };

    // 1. Grid Levels (1, 5, 10)
    const gridLevels = [1, 5, 10];
    let gridHtml = '';
    gridLevels.forEach(level => {
      const y = getY(level);
      gridHtml += `
        <line class="chart-grid-line" x1="${padding.left}" y1="${y}" x2="${svgWidth - padding.right}" y2="${y}"></line>
        <text class="chart-axis-text" x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${level}</text>
      `;
    });

    // 2. Connector Lines (stress reduction visualization)
    let connectorsHtml = '';
    reversedHistory.forEach((session, i) => {
      const x = getX(i);
      const yInitial = getY(session.initial);
      const yFinal = getY(session.final);
      connectorsHtml += `
        <line class="chart-reduction-connector" x1="${x}" y1="${yInitial}" x2="${x}" y2="${yFinal}"></line>
      `;
    });

    // 3. Path Data for Line Lines
    let initialPathData = '';
    let finalPathData = '';
    reversedHistory.forEach((session, i) => {
      const x = getX(i);
      const yInitial = getY(session.initial);
      const yFinal = getY(session.final);

      if (i === 0) {
        initialPathData += `M ${x} ${yInitial}`;
        finalPathData += `M ${x} ${yFinal}`;
      } else {
        initialPathData += ` L ${x} ${yInitial}`;
        finalPathData += ` L ${x} ${yFinal}`;
      }
    });

    // 4. Dot points for user sessions
    let dotsHtml = '';
    reversedHistory.forEach((session, i) => {
      const x = getX(i);
      const yInitial = getY(session.initial);
      const yFinal = getY(session.final);
      
      const formattedDate = session.date || 'Unknown Date';
      const tooltipInitial = `Session ${i + 1} (${formattedDate}): Initial SUDS = ${session.initial}`;
      const tooltipFinal = `Session ${i + 1} (${formattedDate}): Final SUDS = ${session.final}`;

      dotsHtml += `
        <circle class="chart-dot-initial" cx="${x}" cy="${yInitial}" r="4" data-tooltip="${tooltipInitial}">
          <title>${tooltipInitial}</title>
        </circle>
        <circle class="chart-dot-final" cx="${x}" cy="${yFinal}" r="4" data-tooltip="${tooltipFinal}">
          <title>${tooltipFinal}</title>
        </circle>
      `;
    });

    // Assemble SVG HTML Content
    chartContainer.innerHTML = `
      <svg class="history-chart-svg" viewBox="0 0 ${svgWidth} ${svgHeight}">
        <!-- Grid Levels -->
        ${gridHtml}
        
        <!-- Connector Lines -->
        ${connectorsHtml}
        
        <!-- Lines (only if we have more than 1 data point) -->
        ${total > 1 ? `<path class="chart-line-initial" d="${initialPathData}"></path>` : ''}
        ${total > 1 ? `<path class="chart-line-final" d="${finalPathData}"></path>` : ''}
        
        <!-- Dots -->
        ${dotsHtml}
      </svg>
      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-color legend-initial"></div>
          <span>Initial SUDS</span>
        </div>
        <div class="legend-item">
          <div class="legend-color legend-final"></div>
          <span>Final SUDS</span>
        </div>
      </div>
    `;
  }

  // --- BUTTON EVENT ROUTING ---
  
  // Welcome -> Recall / TFT Focus
  document.getElementById('btn-welcome-start').addEventListener('click', () => {
    state.isSubsequentSet = false;
    const advCb = document.getElementById('advanced-mode-checkbox');
    state.advancedMode = advCb ? advCb.checked : false;
    resetSensoryInputs();
    
    if (state.advancedMode) {
      showScreen('screen-recall');
    } else {
      showScreen('screen-tft-focus');
    }
  });

  // Recall -> SUDS
  document.getElementById('btn-recall-focused').addEventListener('click', () => {
    // Reset SUDS buttons selection
    const initGrid = document.getElementById('initial-suds-grid');
    const initBtn = document.getElementById('btn-initial-suds-next');
    const initIndicator = document.getElementById('initial-suds-indicator');
    
    if (initGrid) initGrid.querySelectorAll('.suds-btn').forEach(b => b.classList.remove('selected'));
    if (initBtn) initBtn.disabled = true;
    if (initIndicator) initIndicator.textContent = 'Select a distress rating';
    
    showScreen('screen-initial-suds');
  });

  // Initial SUDS Back & Next
  document.getElementById('btn-initial-suds-back').addEventListener('click', () => {
    if (state.advancedMode) {
      showScreen('screen-recall');
    } else {
      showScreen('screen-tft-focus');
    }
  });
  
  document.getElementById('btn-initial-suds-next').addEventListener('click', () => {
    if (state.isSubsequentSet) {
      showScreen('screen-tft-focus');
    } else if (state.advancedMode) {
      showScreen('screen-sensory-images');
    } else {
      showScreen('screen-eft-tapping');
    }
  });

  // Sensory Images Back & Next
  document.getElementById('btn-sensory-images-back').addEventListener('click', () => {
    showScreen('screen-initial-suds');
  });
  document.getElementById('btn-sensory-images-next').addEventListener('click', () => {
    captureSensoryData();
    showScreen('screen-sensory-sounds');
  });

  // Sensory Sounds Back & Next
  document.getElementById('btn-sensory-sounds-back').addEventListener('click', () => {
    showScreen('screen-sensory-images');
  });
  document.getElementById('btn-sensory-sounds-next').addEventListener('click', () => {
    captureSensoryData();
    showScreen('screen-sensory-tactile');
  });

  // Sensory Tactile Back & Next
  document.getElementById('btn-sensory-tactile-back').addEventListener('click', () => {
    showScreen('screen-sensory-sounds');
  });
  document.getElementById('btn-sensory-tactile-next').addEventListener('click', () => {
    captureSensoryData();
    showScreen('screen-sensory-tastes');
  });

  // Sensory Tastes Back & Next
  document.getElementById('btn-sensory-tastes-back').addEventListener('click', () => {
    showScreen('screen-sensory-tactile');
  });
  document.getElementById('btn-sensory-tastes-next').addEventListener('click', () => {
    captureSensoryData();
    showScreen('screen-sensory-smells');
  });

  // Sensory Smells Back & Next
  document.getElementById('btn-sensory-smells-back').addEventListener('click', () => {
    showScreen('screen-sensory-tastes');
  });
  document.getElementById('btn-sensory-smells-next').addEventListener('click', () => {
    captureSensoryData();
    showScreen('screen-tft-focus');
  });

  // TFT Focus Back & Next
  document.getElementById('btn-tft-focus-back').addEventListener('click', () => {
    if (state.isSubsequentSet) {
      showScreen('screen-summary');
    } else if (state.advancedMode) {
      showScreen('screen-sensory-smells');
    } else {
      showScreen('screen-welcome');
    }
  });
  document.getElementById('btn-tft-focus-next').addEventListener('click', () => {
    if (state.isSubsequentSet || state.advancedMode) {
      showScreen('screen-eft-tapping');
    } else {
      // In basic mode, first evaluation happens after TFT Focus
      if (state.initialSuds === null) {
        // Reset SUDS buttons selection
        const initGrid = document.getElementById('initial-suds-grid');
        const initBtn = document.getElementById('btn-initial-suds-next');
        const initIndicator = document.getElementById('initial-suds-indicator');
        
        if (initGrid) initGrid.querySelectorAll('.suds-btn').forEach(b => b.classList.remove('selected'));
        if (initBtn) initBtn.disabled = true;
        if (initIndicator) initIndicator.textContent = 'Select a distress rating';
        
        showScreen('screen-initial-suds');
      } else {
        showScreen('screen-eft-tapping');
      }
    }
  });

  // EFT Tapping Back & Next
  document.getElementById('btn-eft-tapping-back').addEventListener('click', () => {
    if (state.isSubsequentSet || state.advancedMode) {
      showScreen('screen-tft-focus');
    } else {
      showScreen('screen-initial-suds');
    }
  });
  document.getElementById('btn-eft-tapping-next').addEventListener('click', () => {
    showScreen('screen-9-gamut');
  });

  // 9 Gamut Back & Next
  document.getElementById('btn-9-gamut-back').addEventListener('click', () => {
    showScreen('screen-eft-tapping');
  });
  document.getElementById('btn-9-gamut-next').addEventListener('click', () => {
    showScreen('screen-stimulation');
    startBilateralStimulation();
  });

  // Deep Breath Continue -> NLP
  document.getElementById('btn-deep-breath-continue').addEventListener('click', () => {
    showScreen('screen-nlp');
  });

  // NLP Interactive Flow Next Step
  document.getElementById('btn-nlp-next-step').addEventListener('click', () => {
    if (state.nlp.currentState === 'color') {
      state.nlp.currentState = 'grayscale';
      
      const projection = document.getElementById('nlp-memory-projection');
      if (projection) projection.classList.add('grayscale-fade');

      // Switch scene animation from color-fade to shrinking
      const scene = document.getElementById('nlp-memory-scene');
      if (scene) {
        scene.classList.add('scene-shrinking');
      }
      
      const instruction = document.getElementById('nlp-instruction');
      if (instruction) {
        instruction.textContent = "Now, through your mental focus, imagine shrinking the black and white image. Picture it moving further away, getting smaller and smaller until it is just a tiny, harmless dot.";
      }
      
      const nextBtn = document.getElementById('btn-nlp-next-step');
      if (nextBtn) nextBtn.textContent = "I have shrunk it to a dot";
      
    } else if (state.nlp.currentState === 'grayscale') {
      state.nlp.currentState = 'erase';
      
      // Fix scene as small grayscale image with fade-out animation
      const scene = document.getElementById('nlp-memory-scene');
      if (scene) {
        scene.classList.remove('scene-shrinking');
        scene.classList.add('scene-erasing');
      }
      
      const instruction = document.getElementById('nlp-instruction');
      if (instruction) {
        instruction.textContent = "Now imagine a large eraser sweeping across this small image, wiping it away completely as it passes...";
      }
      
      const nextBtn = document.getElementById('btn-nlp-next-step');
      if (nextBtn) nextBtn.style.display = 'none';
      
      // Show eraser with automatic sweep animation
      const eraser = document.getElementById('nlp-eraser-indicator');
      if (eraser) {
        eraser.classList.add('auto-sweep');
      }
      
      // After the sweep animation completes, trigger dissolution
      setTimeout(() => {
        const canvas = document.getElementById('nlp-canvas');
        if (canvas && state.nlp.currentState === 'erase') {
          triggerNlpErasure(canvas.width / 2, canvas.height / 2);
        }
      }, 7000);
    }
  });

  // NLP Finish -> Post SUDS
  document.getElementById('btn-nlp-finish').addEventListener('click', () => {
    // Clear post-suds selections to force a re-evaluation
    const postGrid = document.getElementById('post-suds-grid');
    const postBtn = document.getElementById('btn-post-suds-next');
    const postIndicator = document.getElementById('post-suds-indicator');
    
    if (postGrid) postGrid.querySelectorAll('.suds-btn').forEach(b => b.classList.remove('selected'));
    if (postBtn) postBtn.disabled = true;
    if (postIndicator) postIndicator.textContent = 'Select your current rating';

    showScreen('screen-post-suds');
  });

  // Post SUDS Continue
  document.getElementById('btn-post-suds-next').addEventListener('click', () => {
    showScreen('screen-summary');
  });

  // Repeat Session (Start another set)
  document.getElementById('btn-repeat-session').addEventListener('click', () => {
    state.isSubsequentSet = true;
    
    // Set current post-distress as the new initial reference point
    state.initialSuds = state.postSuds;
    state.postSuds = null;
    
    showScreen('screen-tft-focus');
  });

  // Finish Session (Log it)
  document.getElementById('btn-finish-session').addEventListener('click', () => {
    showScreen('screen-finish');
  });

  // Restart app (New session)
  document.getElementById('btn-restart-app').addEventListener('click', () => {
    state.isSubsequentSet = false;
    state.initialSuds = null;
    state.postSuds = null;
    state.advancedMode = false;
    const advCb = document.getElementById('advanced-mode-checkbox');
    if(advCb) advCb.checked = false;
    resetSensoryInputs();
    showScreen('screen-welcome');
  });

  // Initialize display and listeners immediately
  renderHistoryList();
  initTappingListListeners();
  initNlpListeners();
});
