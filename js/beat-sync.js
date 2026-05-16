export class BeatSync {
  constructor() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.bpm = 120;
    this.offset = 0;            // seconds – now treated directly as seconds
    this.source = null;
    this.startTime = 0;         // AudioContext time when playback started
    this._isPlaying = false;
    this.useMetronome = false;
    this.metroStart = 0;

    this.playlist = [];
    this.currentTrackIndex = -1;
    this.onEndCallback = null;
    this.musicGain = null;
  }

  async loadPlaylist(tracks) {
    this.playlist = tracks;
    for (let i = 0; i < this.playlist.length; i++) {
      try {
        await this.loadTrack(i);
      } catch (err) {
        console.warn(`Skipping ${this.playlist[i].url}: ${err.message}`);
        this.playlist[i].buffer = null;
      }
    }
    const firstValid = this.playlist.findIndex(t => t.buffer);
    if (firstValid >= 0) {
      this.currentTrackIndex = firstValid;
      this.bpm = this.playlist[firstValid].bpm;
      // ✅ offset is now in seconds – no division
      this.offset = this.playlist[firstValid].offset || 0;
    }
  }

  async loadTrack(index) {
    const track = this.playlist[index];
    const resp = await fetch(encodeURI(track.url));
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const arrayBuf = await resp.arrayBuffer();
    const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuf);
    this.playlist[index].buffer = audioBuffer;
    console.log(`✅ Track loaded: ${track.url}`);
  }

  playCurrent() {
    const track = this.playlist[this.currentTrackIndex];
    if (!track || !track.buffer) {
      console.warn('⚠️ No valid track – falling back to metronome.');
      this.startMetronome();
      return false;
    }
    this.stop();

    this.source = this.audioCtx.createBufferSource();
    this.source.buffer = track.buffer;

    this.musicGain = this.audioCtx.createGain();
    this.musicGain.gain.value = 0.45;
    this.source.connect(this.musicGain);
    this.musicGain.connect(this.audioCtx.destination);

    // ✅ Start from the beginning – offset is only used for beat timing
    this.source.start(0);
    this.startTime = this.audioCtx.currentTime;
    this._isPlaying = true;
    this.useMetronome = false;

    this.source.onended = () => {
      if (this._isPlaying && !this.useMetronome) {
        console.log('🎵 Song ended.');
        this._isPlaying = false;
        if (this.onEndCallback) this.onEndCallback();
      }
    };

    console.log(`🎵 Now playing: ${track.name || track.url}`);
    return true;
  }

  playRandom() {
    const validIndices = this.playlist
      .map((t, i) => (t.buffer ? i : -1))
      .filter(i => i !== -1);
    if (validIndices.length === 0) {
      console.warn('⚠️ No tracks loaded – starting metronome.');
      this.startMetronome();
      return false;
    }
    let nextIndex;
    if (validIndices.length === 1) {
      nextIndex = validIndices[0];
    } else {
      do {
        nextIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
      } while (nextIndex === this.currentTrackIndex && validIndices.length > 1);
    }
    this.currentTrackIndex = nextIndex;
    const track = this.playlist[nextIndex];
    this.bpm = track.bpm;
    this.offset = track.offset || 0;   // ✅ seconds
    return this.playCurrent();
  }

  startMetronome(bpm = 120) {
    this.stop();
    this.bpm = bpm;
    this.offset = 0;
    this.startTime = performance.now() / 1000;
    this._isPlaying = true;
    this.useMetronome = true;
    console.log(`🔊 Metronome started at ${bpm} BPM`);
  }

  // ✅ resume() is now async – await it before using
  async resume() {
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
      console.log('🔊 AudioContext resumed.');
    }
  }

  getCurrentBeat() {
    if (!this._isPlaying) return -1;
    let elapsed;
    if (this.useMetronome) {
      elapsed = performance.now() / 1000 - this.startTime;
    } else {
      elapsed = this.audioCtx.currentTime - this.startTime;
    }

    // ✅ Apply offset to shift the beat grid (positive offset = beats come later)
    elapsed -= this.offset;
    if (elapsed < 0) return 0;

    const beatDuration = 60 / this.bpm;
    return elapsed / beatDuration;
  }

  stop() {
    if (this.source) {
      try { this.source.stop(); } catch (e) {}
      this.source.disconnect();
      this.source = null;
    }
    if (this.musicGain) {
      this.musicGain.disconnect();
      this.musicGain = null;
    }
    this._isPlaying = false;
  }

  getCurrentTrackName() {
    if (this.currentTrackIndex >= 0 && this.playlist[this.currentTrackIndex]) {
      return this.playlist[this.currentTrackIndex].name || 'Unknown Song';
    }
    return 'No Song';
  }
}