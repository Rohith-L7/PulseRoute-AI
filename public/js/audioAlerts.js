// Web Audio API Synthesizer for Emergency Dispatch Sounds & Ambulance Sirens
class EmergencyAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.sirenOsc1 = null;
    this.sirenOsc2 = null;
    this.sirenGain = null;
    this.sirenInterval = null;
    this.isSirenMuted = true;
    this.isSirenPlaying = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
  }

  toggleMute() {
    this.isSirenMuted = !this.isSirenMuted;
    if (this.isSirenMuted) {
      this.stopSiren();
    } else {
      if (this.isSirenPlaying) {
        this.startSiren();
      }
    }
    return this.isSirenMuted;
  }

  // Play high-priority dispatch radio chime
  playDispatchChime() {
    if (this.isSirenMuted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12); // E6

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Urgent reroute warning beep
  playRerouteAlert() {
    if (this.isSirenMuted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      [0, 0.15, 0.3].forEach((delay, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(idx === 2 ? 1046.5 : 784, now + delay);

        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.12);
      });
    } catch (e) {
      console.warn('Reroute alert audio error', e);
    }
  }

  // Dual-tone ambulance siren wail
  startSiren() {
    this.isSirenPlaying = true;
    if (this.isSirenMuted) return;
    this.init();
    if (!this.audioCtx) return;

    if (this.sirenOsc1) {
      this.stopSiren(false);
    }

    try {
      this.sirenOsc1 = this.audioCtx.createOscillator();
      this.sirenGain = this.audioCtx.createGain();

      this.sirenOsc1.type = 'triangle';
      this.sirenGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

      this.sirenOsc1.connect(this.sirenGain);
      this.sirenGain.connect(this.audioCtx.destination);

      this.sirenOsc1.start();

      let toggle = false;
      this.sirenInterval = setInterval(() => {
        if (!this.audioCtx || !this.sirenOsc1) return;
        const targetFreq = toggle ? 650 : 900;
        this.sirenOsc1.frequency.exponentialRampToValueAtTime(targetFreq, this.audioCtx.currentTime + 0.4);
        toggle = !toggle;
      }, 450);
    } catch (e) {
      console.warn('Siren audio error', e);
    }
  }

  stopSiren(markStopped = true) {
    if (markStopped) this.isSirenPlaying = false;
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.sirenOsc1) {
      try {
        this.sirenOsc1.stop();
        this.sirenOsc1.disconnect();
      } catch (e) {}
      this.sirenOsc1 = null;
    }
  }
}

window.EmergencyAudio = new EmergencyAudioEngine();
