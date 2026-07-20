// Tiny dependency-free sound engine (Web Audio API).
// Call resume() from a user gesture before playing.
let ctx = null
let muted = false
let master = 0.8
let ambientNodes = null

export function setVolume(v) { master = Math.max(0, Math.min(1, v)) }
export function getVolume() { return master }

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)() } catch { ctx = null }
  }
  return ctx
}

export function resume() {
  const c = ac()
  if (c && c.state === 'suspended') c.resume()
}
export function setMuted(m) { 
  muted = m 
  if (m) stopAmbient()
}
export function isMuted() { return muted }

export function startAmbient() {
  const c = ac()
  if (!c || muted) return
  stopAmbient()
  const dur = 4
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1)
  const src = c.createBufferSource()
  src.buffer = buf
  src.loop = true
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  const lfo = c.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.15
  const lfoGain = c.createGain()
  lfoGain.gain.value = 600
  lfo.connect(lfoGain); lfoGain.connect(f.frequency)
  f.frequency.value = 500
  const g = c.createGain()
  g.gain.value = 0.03 * master
  src.connect(f); f.connect(g); g.connect(c.destination)
  src.start(); lfo.start()
  ambientNodes = { src, lfo, g, baseVol: 0.03 }
}

export function stopAmbient() {
  if (ambientNodes) {
    try { ambientNodes.src.stop(); ambientNodes.lfo.stop() } catch {}
    ambientNodes = null
  }
}


function beep(freq, dur, type = 'sine', vol = 0.2, delay = 0) {
  const c = ac()
  if (!c || muted) return
  const t0 = c.currentTime + delay
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  o.connect(g); g.connect(c.destination)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(Math.max(0.0002, vol * master), t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.start(t0); o.stop(t0 + dur + 0.03)
}

function splash(dur = 0.25, vol = 0.25) {
  const c = ac()
  if (!c || muted) return
  const src = c.createBufferSource()
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(1900, c.currentTime)
  f.frequency.exponentialRampToValueAtTime(400, c.currentTime + dur)
  const g = c.createGain()
  g.gain.value = vol * master
  src.connect(f); f.connect(g); g.connect(c.destination)
  src.start()
}

export function play(name) {
  switch (name) {
    case 'cast': splash(0.28, 0.28); break
    case 'bite': beep(680, 0.08, 'square', 0.18); beep(900, 0.08, 'square', 0.18, 0.09); break
    case 'reel': beep(300, 0.03, 'square', 0.06); break
    case 'catch': [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.18, 'triangle', 0.18, i * 0.07)); break
    case 'escape': beep(420, 0.28, 'sawtooth', 0.15); beep(210, 0.4, 'sawtooth', 0.13, 0.11); break
    case 'buy': beep(880, 0.09, 'square', 0.16); beep(1174, 0.12, 'square', 0.16, 0.09); break
    case 'treasure': [659, 784, 988, 1319, 1568].forEach((f, i) => beep(f, 0.16, 'triangle', 0.17, i * 0.06)); break
    case 'trash': beep(160, 0.14, 'square', 0.12); beep(110, 0.2, 'square', 0.1, 0.1); break
    case 'quest': beep(784, 0.1, 'triangle', 0.16); beep(1046, 0.16, 'triangle', 0.16, 0.1); break
    default: break
  }
}

// Ensure ambient volume reacts to master volume changes
const oldSetVol = setVolume
export function updateVolume(v) {
  oldSetVol(v)
  if (ambientNodes) ambientNodes.g.gain.value = ambientNodes.baseVol * master
}

let musicVol = 0.5
let musicLoopId = null
let nextNoteTime = 0
let beatIdx = 0

export function setMusicVolume(v) { musicVol = Math.max(0, Math.min(1, v)) }
export function getMusicVolume() { return musicVol }

const BASS_SEQ = [ 130.81, 130.81, 155.56, 174.61, 130.81, 130.81, 155.56, 196.00 ]
const ARP_SEQ = [ 261.63, 311.13, 392.00, 523.25, 261.63, 311.13, 392.00, 523.25 ]

export function startMusic() {
  const c = ac()
  if (!c || muted) return
  if (musicLoopId) return
  nextNoteTime = c.currentTime + 0.1
  beatIdx = 0
  
  musicLoopId = setInterval(() => {
    while (nextNoteTime < c.currentTime + 0.1) {
      scheduleNote(nextNoteTime, beatIdx)
      nextNoteTime += 0.22 // ~136 BPM 8th notes
      beatIdx = (beatIdx + 1) % 16
    }
  }, 30)
}

export function stopMusic() {
  if (musicLoopId) {
    clearInterval(musicLoopId)
    musicLoopId = null
  }
}

function scheduleNote(time, beat) {
  const c = ac()
  if (!c || muted || musicVol <= 0.01) return
  
  // play bass on every 2nd beat
  if (beat % 2 === 0) {
    const fb = BASS_SEQ[(beat / 2) % BASS_SEQ.length]
    playTone(c, time, fb, 0.2, 'square', 0.1 * musicVol)
  }
  
  // play arp on every beat
  const fa = ARP_SEQ[beat % ARP_SEQ.length]
  playTone(c, time, fa, 0.1, 'triangle', 0.08 * musicVol)
}

function playTone(c, t, freq, dur, type, vol) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  o.connect(g); g.connect(c.destination)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.start(t); o.stop(t + dur + 0.05)
}
