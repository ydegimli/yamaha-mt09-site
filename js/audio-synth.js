/**
 * Yamaha MT-09 CP3 Engine Sound Synthesizer (Web Audio API)
 * Simulates the iconic 890cc 3-cylinder Crossplane firing order audio profile
 */

class CP3EngineSynth {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.targetRpm = 1200;
    this.currentRpm = 1200;
    this.animFrameId = null;

    // Nodes
    this.masterGain = null;
    this.filterNode = null;
    this.distNode = null;
    this.osc1 = null;
    this.osc2 = null;
    this.osc3 = null;
    this.noiseGain = null;
  }

  init() {
    if (this.audioCtx) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    // Master Gain
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);

    // Low Pass Filter (Exhaust & Intake Resonator)
    this.filterNode = this.audioCtx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(250, this.audioCtx.currentTime);
    this.filterNode.Q.setValueAtTime(4, this.audioCtx.currentTime);

    // Distortion / Warmth
    this.distNode = this.audioCtx.createWaveShaper();
    this.distNode.curve = this.makeDistortionCurve(20);
    this.distNode.oversample = '4x';

    // 3-Cylinder Oscillators (CP3 Firing interval representation)
    this.osc1 = this.audioCtx.createOscillator();
    this.osc2 = this.audioCtx.createOscillator();
    this.osc3 = this.audioCtx.createOscillator();

    this.osc1.type = 'sawtooth';
    this.osc2.type = 'triangle';
    this.osc3.type = 'sawtooth';

    // Frequencies base for idle (approx 1200 RPM = 60 Hz fundamental firing)
    this.updateFrequencies(1200);

    // Sub-bass rumble noise
    const bufferSize = this.audioCtx.sampleRate * 2;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const noiseFilter = this.audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(180, this.audioCtx.currentTime);
    noiseFilter.Q.setValueAtTime(3, this.audioCtx.currentTime);

    this.noiseGain = this.audioCtx.createGain();
    this.noiseGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    whiteNoise.start();

    // Wiring oscillators
    const oscGain = this.audioCtx.createGain();
    oscGain.gain.setValueAtTime(0.6, this.audioCtx.currentTime);

    this.osc1.connect(oscGain);
    this.osc2.connect(oscGain);
    this.osc3.connect(oscGain);

    oscGain.connect(this.distNode);
    this.distNode.connect(this.filterNode);
    this.filterNode.connect(this.masterGain);
    this.masterGain.connect(this.audioCtx.destination);

    this.osc1.start();
    this.osc2.start();
    this.osc3.start();
  }

  makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  start() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    if (!this.audioCtx) {
      this.init();
    }
    this.isPlaying = true;
    this.masterGain.gain.setTargetAtTime(0.35, this.audioCtx.currentTime, 0.05);
    this.loop();
  }

  stop() {
    this.isPlaying = false;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.1);
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  setRpm(rpm) {
    this.targetRpm = Math.max(1200, Math.min(10500, rpm));
  }

  updateFrequencies(rpm) {
    if (!this.audioCtx) return;

    // RPM to Hz conversion for 3-cylinder 4-stroke engine
    // Firing frequency = (RPM / 60) * (3 / 2)
    const fundamental = (rpm / 60) * 1.5;
    
    const now = this.audioCtx.currentTime;
    this.osc1.frequency.setTargetAtTime(fundamental, now, 0.03);
    this.osc2.frequency.setTargetAtTime(fundamental * 2.01, now, 0.03); // Harmonic
    this.osc3.frequency.setTargetAtTime(fundamental * 3.02, now, 0.03); // Acoustic duct resonance

    // Filter opens up significantly with higher RPM
    const cutoff = 250 + (rpm / 10500) * 4500;
    this.filterNode.frequency.setTargetAtTime(cutoff, now, 0.03);

    // Noise rumble follows throttle
    if (this.noiseGain) {
      this.noiseGain.gain.setTargetAtTime(0.05 + (rpm / 10500) * 0.15, now, 0.03);
    }
  }

  quickshiftPop() {
    if (!this.isPlaying || !this.audioCtx) return;

    // Simulate Quickshifter ignition cut pop sound
    const now = this.audioCtx.currentTime;
    
    // Brief gain drop followed by aggressive pop
    this.masterGain.gain.setValueAtTime(0.05, now);
    this.masterGain.gain.setValueAtTime(0.5, now + 0.04);
    this.masterGain.gain.setTargetAtTime(0.35, now + 0.08, 0.05);

    // Filter spike for pop effect
    this.filterNode.frequency.setValueAtTime(6000, now + 0.04);
    this.filterNode.frequency.setTargetAtTime(250 + (this.currentRpm / 10500) * 4500, now + 0.08, 0.05);
  }

  loop() {
    if (!this.isPlaying) return;

    // Smooth RPM interpolation
    this.currentRpm += (this.targetRpm - this.currentRpm) * 0.12;
    this.updateFrequencies(this.currentRpm);

    // Custom event callback for UI updates
    if (this.onRpmUpdate) {
      this.onRpmUpdate(this.currentRpm);
    }

    this.animFrameId = requestAnimationFrame(() => this.loop());
  }
}

// Global instance export
window.cp3Synth = new CP3EngineSynth();
