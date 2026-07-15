// Web Audio API Sound Synthesizer for Theme Park Queue Simulation
class SoundManager {
  constructor() {
    this.ctx = null;
    this.musicVolumeNode = null;
    this.sfxVolumeNode = null;
    this.masterVolumeNode = null;
    
    this.musicEnabled = false;
    this.sfxEnabled = true;
    this.musicVolume = 0.3;
    this.sfxVolume = 0.5;
    
    // Music sequencing state
    this.musicTimer = null;
    this.currentStep = 0;
    
    // Looping SFX states
    this.clackInterval = null;
    this.whooshNode = null;
    this.whooshFilter = null;
  }

  init() {
    if (this.ctx) return;
    
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterVolumeNode = this.ctx.createGain();
      this.masterVolumeNode.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterVolumeNode.connect(this.ctx.destination);
      
      this.musicVolumeNode = this.ctx.createGain();
      this.musicVolumeNode.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicVolumeNode.connect(this.masterVolumeNode);
      
      this.sfxVolumeNode = this.ctx.createGain();
      this.sfxVolumeNode.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxVolumeNode.connect(this.masterVolumeNode);
      
      console.log("Web Audio Context initialized successfully.");
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser:", e);
    }
  }

  resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(category, value) {
    this.init();
    this.resumeContext();
    const val = Math.max(0, Math.min(1, value));
    if (category === 'music') {
      this.musicVolume = val;
      if (this.musicVolumeNode) {
        this.musicVolumeNode.gain.setValueAtTime(val, this.ctx.currentTime);
      }
    } else if (category === 'sfx') {
      this.sfxVolume = val;
      if (this.sfxVolumeNode) {
        this.sfxVolumeNode.gain.setValueAtTime(val, this.ctx.currentTime);
      }
    }
  }

  toggleMusic(enabled) {
    this.init();
    this.resumeContext();
    this.musicEnabled = enabled;
    if (enabled) {
      this.startAmbientMusic();
    } else {
      this.stopAmbientMusic();
    }
  }

  toggleSfx(enabled) {
    this.init();
    this.resumeContext();
    this.sfxEnabled = enabled;
    if (!enabled) {
      this.stopLiftChainClack();
    }
  }

  // --- MUSIC SYNTHESIZER ---
  // Cute, retro calliope-style amusement park music sequenced procedurally!
  startAmbientMusic() {
    if (!this.ctx || !this.musicEnabled) return;
    if (this.musicTimer) return;

    this.currentStep = 0;
    
    // Simple 3/4 waltz progression: C -> Am -> F -> G
    // Melodic notes in C Major scale
    const bassRootNotes = [48, 48, 45, 45, 41, 41, 43, 43]; // MIDI numbers (C3, A2, F2, G2)
    const chords = [
      [60, 64, 67], // C Major
      [60, 64, 67], 
      [57, 60, 64], // A minor
      [57, 60, 64],
      [53, 57, 60], // F Major
      [53, 57, 60],
      [55, 59, 62], // G Major
      [55, 59, 62]
    ];
    
    const melodyPattern = [
      [72, 76, 79], [null], [76, 79],
      [72, 76, 79], [null], [76, 79],
      [71, 74, 77], [null], [74, 77],
      [71, 74, 77], [null], [74, 77],
      [69, 72, 76], [null], [72, 76],
      [69, 72, 76], [null], [72, 76],
      [71, 74, 79], [null], [74, 79],
      [71, 74, 79], [null], [76, 77, 79]
    ];

    const tempo = 220; // ms per step (approx 90 BPM eighth notes)
    
    const playNote = (midiNum, time, duration, type = 'sine', volumeMultiplier = 0.5) => {
      if (!this.ctx || this.ctx.state === 'suspended') return;
      const freq = 440 * Math.pow(2, (midiNum - 69) / 12);
      
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.12 * volumeMultiplier, time + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      
      osc.connect(gainNode);
      gainNode.connect(this.musicVolumeNode);
      
      osc.start(time);
      osc.stop(time + duration);
    };

    const tick = () => {
      if (!this.musicEnabled) return;
      const now = this.ctx.currentTime;
      const duration = 0.2;
      
      const measure = Math.floor(this.currentStep / 6) % 8;
      const stepInMeasure = this.currentStep % 6;
      
      // Step 0: Bass root note
      if (stepInMeasure === 0) {
        playNote(bassRootNotes[measure], now, 0.45, 'triangle', 0.8);
      }
      
      // Step 2 & 4: Chord comping (waltz style)
      if (stepInMeasure === 2 || stepInMeasure === 4) {
        chords[measure].forEach(note => {
          playNote(note, now, 0.25, 'sine', 0.4);
        });
      }
      
      // Melodic line on top (with variations)
      const melodyIndex = (this.currentStep % melodyPattern.length);
      const melodyNotes = melodyPattern[melodyIndex];
      if (melodyNotes && melodyNotes[0] !== null) {
        const selectedNote = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
        // Play melodic chime
        playNote(selectedNote + 12, now, 0.35, 'triangle', 0.3);
      }
      
      this.currentStep++;
      this.musicTimer = setTimeout(tick, tempo);
    };
    
    tick();
  }

  stopAmbientMusic() {
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  // --- SOUND EFFECTS ---

  // Rhythmic click-clack for lift hill
  startLiftChainClack() {
    if (!this.ctx || !this.sfxEnabled) return;
    if (this.clackInterval) return;

    this.clackInterval = setInterval(() => {
      this.playSingleClack();
    }, 180);
  }

  stopLiftChainClack() {
    if (this.clackInterval) {
      clearInterval(this.clackInterval);
      this.clackInterval = null;
    }
  }

  playSingleClack() {
    if (!this.ctx || !this.sfxEnabled || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    // Synthesize a heavy click/clack mechanical lock
    const osc = this.ctx.createOscillator();
    const noise = this.createNoiseBufferNode();
    const oscGain = this.ctx.createGain();
    const noiseGain = this.ctx.createGain();
    const bandpass = this.ctx.createBiquadFilter();
    
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(200, now);
    bandpass.Q.setValueAtTime(4, now);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(65, now);
    
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    
    osc.connect(oscGain);
    oscGain.connect(this.sfxVolumeNode);
    
    if (noise) {
      noise.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(this.sfxVolumeNode);
      noise.start(now);
      noise.stop(now + 0.06);
    }
    
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Creates white noise buffer
  createNoiseBufferNode() {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    return whiteNoise;
  }

  // Synthesize wind zoom noise during drops
  playWhooshStart() {
    if (!this.ctx || !this.sfxEnabled || this.ctx.state === 'suspended') return;
    if (this.whooshNode) return;
    
    const now = this.ctx.currentTime;
    this.whooshNode = this.createNoiseBufferNode();
    if (!this.whooshNode) return;
    
    this.whooshFilter = this.ctx.createBiquadFilter();
    this.whooshFilter.type = 'lowpass';
    this.whooshFilter.frequency.setValueAtTime(200, now);
    this.whooshFilter.Q.setValueAtTime(1.5, now);
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.0, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.5); // Fade in
    
    this.whooshNode.connect(this.whooshFilter);
    this.whooshFilter.connect(gainNode);
    gainNode.connect(this.sfxVolumeNode);
    
    this.whooshNode.gainNode = gainNode; // Cache to dispose later
    this.whooshNode.start(now);
  }

  updateWhooshIntensity(speedRatio) {
    if (!this.ctx || !this.sfxEnabled || !this.whooshFilter) return;
    const now = this.ctx.currentTime;
    
    // Scale cut-off frequency with coaster speed ratio (0.0 to 1.0)
    const cutOff = 150 + speedRatio * 1800;
    this.whooshFilter.frequency.setTargetAtTime(cutOff, now, 0.05);
    
    // Scale volume slightly with speed
    const vol = 0.05 + speedRatio * 0.22;
    if (this.whooshNode && this.whooshNode.gainNode) {
      this.whooshNode.gainNode.gain.setTargetAtTime(vol, now, 0.05);
    }
  }

  playWhooshStop() {
    if (this.whooshNode) {
      const now = this.ctx.currentTime;
      const gainNode = this.whooshNode.gainNode;
      if (gainNode) {
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      }
      const nodeToStop = this.whooshNode;
      setTimeout(() => {
        try {
          nodeToStop.stop();
        } catch(e) {}
      }, 600);
      this.whooshNode = null;
      this.whooshFilter = null;
    }
  }

  // Crowd cheer effect: dynamic noise bandpass filter sweeps
  playCheer() {
    if (!this.ctx || !this.sfxEnabled || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    // Cheer whoop: Sweep bandpass filters upward rapidly
    const count = 4;
    for (let i = 0; i < count; i++) {
      const noise = this.createNoiseBufferNode();
      if (!noise) continue;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      
      const startFreq = 200 + Math.random() * 200;
      const endFreq = 800 + Math.random() * 800;
      const QVal = 3 + Math.random() * 4;
      const delay = Math.random() * 0.4;
      const duration = 1.0 + Math.random() * 1.5;
      
      filter.frequency.setValueAtTime(startFreq, now + delay);
      filter.frequency.exponentialRampToValueAtTime(endFreq, now + delay + 0.3);
      filter.frequency.exponentialRampToValueAtTime(startFreq - 100, now + delay + duration);
      filter.Q.setValueAtTime(QVal, now + delay);
      
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.setValueAtTime(0, now + delay);
      gainNode.gain.linearRampToValueAtTime(0.08, now + delay + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      
      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.sfxVolumeNode);
      
      noise.start(now + delay);
      noise.stop(now + delay + duration + 0.1);
      
      // Pitch cheering vocal tone
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      
      const oscFreq = 250 + Math.random() * 100;
      osc.frequency.setValueAtTime(oscFreq, now + delay);
      osc.frequency.linearRampToValueAtTime(oscFreq * 1.8, now + delay + 0.25);
      osc.frequency.exponentialRampToValueAtTime(oscFreq * 0.8, now + delay + duration);
      
      const oscLfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      oscLfo.frequency.value = 8 + Math.random() * 5; // Vibrato
      lfoGain.gain.value = 15;
      
      oscLfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.setValueAtTime(0, now + delay);
      oscGain.gain.linearRampToValueAtTime(0.02, now + delay + 0.25);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      
      osc.connect(oscGain);
      oscGain.connect(this.sfxVolumeNode);
      
      oscLfo.start(now + delay);
      osc.start(now + delay);
      
      oscLfo.stop(now + delay + duration);
      osc.stop(now + delay + duration);
    }
  }

  // Screaming sound (whoo-hoo/scared pitches)
  playScream() {
    if (!this.ctx || !this.sfxEnabled || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    // Fast high pitched siren-like sweeps simulating high-energy yells
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const delay = Math.random() * 0.3;
      const duration = 0.8 + Math.random() * 0.8;
      
      osc.type = 'sawtooth';
      
      const baseFreq = 500 + Math.random() * 300;
      osc.frequency.setValueAtTime(baseFreq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + delay + 0.15);
      osc.frequency.linearRampToValueAtTime(baseFreq * 0.5, now + delay + duration);
      
      // Vibrato/tremolo
      const vibrato = this.ctx.createOscillator();
      const vibGain = this.ctx.createGain();
      vibrato.frequency.value = 12 + Math.random() * 8;
      vibGain.gain.value = 35;
      vibrato.connect(vibGain);
      vibGain.connect(osc.frequency);
      
      // High pass filter to sound vocal
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now + delay);
      filter.Q.setValueAtTime(1.0, now + delay);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.setValueAtTime(0, now + delay);
      gainNode.gain.linearRampToValueAtTime(0.025, now + delay + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.sfxVolumeNode);
      
      vibrato.start(now + delay);
      osc.start(now + delay);
      vibrato.stop(now + delay + duration);
      osc.stop(now + delay + duration);
    }
  }

  // Classic amusement park chime "ding-dong" for notifications/announcements
  playDingDong() {
    if (!this.ctx || !this.sfxEnabled || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    // Notes: E5 (659Hz) followed by C5 (523Hz)
    const playChime = (frequency, startTime) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.8);
      
      osc.connect(gainNode);
      gainNode.connect(this.sfxVolumeNode);
      
      osc.start(startTime);
      osc.stop(startTime + 0.85);
    };
    
    playChime(659.25, now); // E5
    playChime(523.25, now + 0.35); // C5
  }

  // Gate clink/slid sound when gate opens/closes
  playGateSound() {
    if (!this.ctx || !this.sfxEnabled || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    const noise = this.createNoiseBufferNode();
    if (!noise) return;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(2.0, now);
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxVolumeNode);
    
    noise.start(now);
    noise.stop(now + 0.2);
    
    // metallic click
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    
    oscGain.gain.setValueAtTime(0.15, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.connect(oscGain);
    oscGain.connect(this.sfxVolumeNode);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Mechanical alarm buzzer for breakdowns
  playBuzzer() {
    if (!this.ctx || !this.sfxEnabled || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(140, now);
    
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(143, now); // slightly detuned
    
    // Buzz pulse modulation
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.001, now + 0.25);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.35);
    gainNode.gain.linearRampToValueAtTime(0.001, now + 0.55);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.65);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.sfxVolumeNode);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.25);
    osc2.stop(now + 1.25);
  }

  // Mechanic clang tool sounds for repairs
  playClang() {
    if (!this.ctx || !this.sfxEnabled || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    // Create multiple high freq sine wave spikes with rapid decay to sound like metal hammer impacts
    const freq = [950, 1420, 2200];
    const delays = [0.0, 0.05, 0.12];
    
    freq.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + delays[idx]);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.setValueAtTime(0, now + delays[idx]);
      gainNode.gain.linearRampToValueAtTime(0.08, now + delays[idx] + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delays[idx] + 0.25);
      
      osc.connect(gainNode);
      gainNode.connect(this.sfxVolumeNode);
      osc.start(now + delays[idx]);
      osc.stop(now + delays[idx] + 0.26);
    });
  }
}

// Single exported instance to maintain context across components
export const soundManager = new SoundManager();
