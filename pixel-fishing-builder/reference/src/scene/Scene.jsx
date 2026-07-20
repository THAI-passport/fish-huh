import { useEffect, useRef, useState } from 'react'
import { drawFish } from '../pixel/sprites.js'
import { fishByZone } from '../data/fish.js'
import { RARITY } from '../data/zones.js'
import { rollSize } from '../game.js'
import * as sfx from '../audio/sfx.js'

const TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary']

const DIFF = {
  easy: { start: 1.25, bar: 1.18, fill: 1.2, drain: 0.65, marker: 0.8 },
  normal: { start: 1, bar: 1, fill: 1, drain: 1, marker: 1 },
  hard: { start: 0.8, bar: 0.85, fill: 0.85, drain: 1.35, marker: 1.3 },
}

const W = 640
const H = 560
const WATER = 200 // y of the water surface

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b))
  return `rgb(${r},${g},${b})`
}

function lerp(a, b, f) { return Math.round(a + (b - a) * f) }

function weightedPick(pool, luck = 0) {
  const draw = () => {
    const total = pool.reduce((s, f) => s + RARITY[f.rarity].weight, 0)
    let r = Math.random() * total
    for (const f of pool) { r -= RARITY[f.rarity].weight; if (r <= 0) return f }
    return pool[pool.length - 1]
  }
  let pick = draw()
  // each luck point = one extra draw, keep the rarer result
  for (let i = 0; i < luck; i++) {
    const d = draw()
    if (TIERS.indexOf(d.rarity) > TIERS.indexOf(pick.rarity)) pick = d
  }
  return pick
}

function fishScale(data) {
  return 2 + Math.min(3, Math.round(data.maxSize / 70))
}

export default function Scene({ zone, onResult, upgrades, difficulty = 'normal' }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const onResultRef = useRef(onResult)
  const zoneRef = useRef(zone)
  const upgradesRef = useRef(upgrades)
  const difficultyRef = useRef(difficulty)
  const actionsRef = useRef({})
  const [uiPhase, setUiPhase] = useState('idle')
  useEffect(() => { onResultRef.current = onResult }, [onResult])
  useEffect(() => { zoneRef.current = zone }, [zone])
  useEffect(() => { upgradesRef.current = upgrades }, [upgrades])
  useEffect(() => { difficultyRef.current = difficulty }, [difficulty])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf
    let t = 0
    let lastPhase = 'idle'

    const night = zoneRef.current.id === 'deepsea'
    let weather = 'clear', weatherNext = 0, weatherSteer = 0, weatherLuck = 0, flash = 0

    function daylight() {
      if (night) return 0.12
      return 0.5 + 0.5 * Math.sin(t / 900)
    }

    // Swimming fish population.
    const swimmers = []
    function spawnSwimmer(offscreen) {
      const pool = fishByZone(zoneRef.current.id)
      if (!pool.length) return
      const bait = (upgradesRef.current && upgradesRef.current.bait) || 0
      const data = weightedPick(pool, bait + weatherLuck)
      const dir = Math.random() < 0.5 ? -1 : 1
      swimmers.push({
        data,
        x: offscreen ? (dir === 1 ? -60 : W + 60) : 60 + Math.random() * (W - 120),
        baseY: WATER + 46 + Math.random() * (H - WATER - 90),
        yoff: 0,
        vx: dir * (0.3 + Math.random() * 0.5),
        wob: Math.random() * Math.PI * 2,
        scale: fishScale(data),
        targeted: false,
      })
    }
    for (let i = 0; i < 7; i++) spawnSwimmer(false)

    // Game state.
    const g = {
      phase: 'idle', // idle | dropping | waiting | bite | fight | retract
      castX: 250,
      hookY: WATER,
      targetY: 320,
      reeling: false,
      target: null,   // swimmer being lured
      biteData: null, // fish on the hook
      progress: 0,
      tension: 0,
      biteFlash: 0,
      waitStart: 0,
      lift: 0.6,   // set for real at fight start from upgrades + difficulty
      fill: 0.95,
      drain: 0.3,
      markerMul: 1,
      parts: [],
    }

    // ---- reel-gauge tuning ----
    // Make it HARDER: raise MARKER_SPEED / DRAIN, lower BAR_H and FILL.
    // Make it EASIER: the reverse. Current values are set generous for testing.
    const TRACK_X = W - 46
    const TRACK_TOP = WATER + 34
    const TRACK_BOT = H - 40
    const TRACK_H = TRACK_BOT - TRACK_TOP
    const GRAV = 0.26          // catch-zone fall speed
    const LIFT = 0.60          // hold-to-lift strength
    const FILL = 0.95          // catch meter fill per frame when on the fish
    const DRAIN = 0.30         // catch meter drain per frame when off
    const MARKER_SPEED = 0.75  // how fast the fish darts
    const START_PROGRESS = 40  // head start on the catch meter

    // Boat/rod anchor (bobs with the sea).
    function boat() {
      const bob = Math.sin(t / 40) * 3
      return { hullX: 452, hullY: WATER - 20 + bob, rodTipX: 540, rodTipY: 96 + bob, bob }
    }

    function pointer(e) {
      const r = canvas.getBoundingClientRect()
      const px = (e.clientX - r.left) * (W / r.width)
      const py = (e.clientY - r.top) * (H / r.height)
      return { px, py }
    }

    function doCast(px, py) {
      g.castX = Math.max(110, Math.min(430, px))
      g.targetY = Math.max(WATER + 60, Math.min(H - 46, py < WATER ? 320 : py))
      g.hookY = WATER
      g.phase = 'dropping'
      sfx.resume(); sfx.play('cast')
    }

    function onDown(e) {
      e.preventDefault()
      if (g.phase === 'idle') {
        const { px, py } = pointer(e)
        doCast(px, py)
      } else if (g.phase === 'fight') {
        g.reeling = true
      }
    }
    function onUp() { g.reeling = false }

    // Actions the on-screen buttons call.
    actionsRef.current.cast = () => {
      if (g.phase === 'idle') { sfx.resume(); doCast(g.castX || 260, g.targetY || 360) }
    }
    actionsRef.current.reelDown = () => { if (g.phase === 'fight' || g.phase === 'bite') g.reeling = true }
    actionsRef.current.reelUp = () => { g.reeling = false }

    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)

    function finish(landed) {
      const data = g.biteData
      const size = rollSize(data)
      sfx.play(landed ? 'catch' : 'escape')
      if (landed) spawnSplash()
      onResultRef.current && onResultRef.current(data, size, landed)
      g.phase = 'retract'
      g.target = null
    }

    function spawnSplash() {
      for (let i = 0; i < 18; i++) {
        g.parts.push({
          x: g.castX, y: WATER,
          vx: (Math.random() - 0.5) * 5,
          vy: -2 - Math.random() * 5,
          life: 26 + Math.random() * 22,
          c: i % 3 === 0 ? '#ffd23c' : '#eafcff',
        })
      }
    }

    // ---- drawing helpers ----
    function drawSky() {
      const d = daylight()
      const topDay = [143, 208, 239], topNight = [10, 18, 48]
      const botDay = [217, 240, 247], botNight = [22, 36, 74]
      const top = `rgb(${lerp(topNight[0], topDay[0], d)},${lerp(topNight[1], topDay[1], d)},${lerp(topNight[2], topDay[2], d)})`
      const bot = `rgb(${lerp(botNight[0], botDay[0], d)},${lerp(botNight[1], botDay[1], d)},${lerp(botNight[2], botDay[2], d)})`
      const grd = ctx.createLinearGradient(0, 0, 0, WATER)
      grd.addColorStop(0, top); grd.addColorStop(1, bot)
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, WATER)
      // stars fade in at night
      if (d < 0.4) {
        ctx.globalAlpha = (0.4 - d) / 0.4
        ctx.fillStyle = '#ffffff'
        for (let i = 0; i < 40; i++) {
          const sx = (i * 97) % W, sy = (i * 53) % (WATER - 30)
          if ((i * 7 + Math.floor(t / 30)) % 11 < 8) ctx.fillRect(sx, sy, 2, 2)
        }
        ctx.globalAlpha = 1
      }
      // sun (day) crossfades with moon (night)
      ctx.globalAlpha = Math.max(0, d)
      ctx.fillStyle = '#fff3b0'
      ctx.beginPath(); ctx.arc(84, 56, 30, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = Math.max(0, d) * 0.22
      ctx.beginPath(); ctx.arc(84, 56, 44, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = Math.max(0, 1 - d) * 0.9
      ctx.fillStyle = '#dfe6ff'
      ctx.beginPath(); ctx.arc(W - 84, 56, 22, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 1
      // clouds (brighter by day, more at storm)
      ctx.fillStyle = `rgba(255,255,255,${(0.28 + 0.55 * d).toFixed(2)})`
      const nClouds = weather === 'clear' ? 3 : 5
      for (let i = 0; i < nClouds; i++) {
        const cw = 70 + i * 18
        let cx = (i * 150 - t * 0.25) % (W + 160); if (cx < -160) cx += W + 160
        const cy = 24 + (i % 3) * 26
        ctx.fillRect(cx, cy, cw, 14)
        ctx.fillRect(cx + 14, cy - 10, cw - 34, 12)
      }
      // storm gloom
      if (weather === 'storm') { ctx.fillStyle = 'rgba(8,10,22,0.4)'; ctx.fillRect(0, 0, W, WATER) }
    }

    function drawRain() {
      if (weather !== 'rain' && weather !== 'storm') return
      const n = weather === 'storm' ? 130 : 70
      ctx.strokeStyle = 'rgba(180,210,240,0.5)'; ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const x = ((i * 73 + t * 6) % (W + 40)) - 20
        const y = (i * 137 + t * 15) % (WATER + 40)
        ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 11)
      }
      ctx.stroke()
    }

    function drawEnv() {
      const d = daylight()
      const tod = night ? 'Abyss' : d > 0.72 ? 'Day' : d > 0.4 ? 'Dusk' : 'Night'
      const icon = weather === 'rain' ? '🌧' : weather === 'storm' ? '⛈' : weather === 'cloudy' ? '☁'
        : (d > 0.4 ? '☀' : '🌙')
      const label = `${icon} ${tod}`
      ctx.font = '13px monospace'
      const w = ctx.measureText(label).width
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(W - w - 20, 10, w + 14, 22)
      ctx.fillStyle = '#eafaff'; ctx.fillText(label, W - w - 13, 25)
    }

    function drawWater() {
      const base = zoneRef.current.bg
      const grd = ctx.createLinearGradient(0, WATER, 0, H)
      grd.addColorStop(0, shade(base, 30))
      grd.addColorStop(1, shade(base, -55))
      ctx.fillStyle = grd
      ctx.fillRect(0, WATER, W, H - WATER)
      // light rays
      if (!night) {
        ctx.globalAlpha = 0.06; ctx.fillStyle = '#eafcff'
        for (let i = 0; i < 5; i++) {
          const rx = 40 + i * 130 + Math.sin(t / 90 + i) * 12
          ctx.beginPath(); ctx.moveTo(rx, WATER); ctx.lineTo(rx + 40, WATER)
          ctx.lineTo(rx + 90, H); ctx.lineTo(rx - 10, H); ctx.closePath(); ctx.fill()
        }
        ctx.globalAlpha = 1
      }
      // waves at surface
      ctx.strokeStyle = night ? 'rgba(200,220,255,0.5)' : 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 2
      for (let layer = 0; layer < 2; layer++) {
        ctx.beginPath()
        for (let x = 0; x <= W; x += 8) {
          const y = WATER + layer * 4 + Math.sin(x / 26 + t / 22 + layer) * 3
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }

    function drawBubbles() {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      for (let i = 0; i < 14; i++) {
        const bx = (i * 61 + Math.sin(t / 40 + i) * 10) % W
        const by = H - ((t * (0.6 + (i % 4) * 0.2) + i * 90) % (H - WATER)) - 4
        ctx.fillRect(bx, by, 2 + (i % 2), 2 + (i % 2))
      }
    }

    function drawBoat() {
      const b = boat()
      // hull
      ctx.fillStyle = '#7a3b1e'
      ctx.beginPath()
      ctx.moveTo(b.hullX - 60, b.hullY)
      ctx.lineTo(b.hullX + 78, b.hullY)
      ctx.lineTo(b.hullX + 62, b.hullY + 22)
      ctx.lineTo(b.hullX - 42, b.hullY + 22)
      ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#9c5a30'
      ctx.fillRect(b.hullX - 52, b.hullY, 122, 5)
      // cabin
      ctx.fillStyle = '#c9d3d8'
      ctx.fillRect(b.hullX + 30, b.hullY - 22, 34, 22)
      ctx.fillStyle = '#3a6b8c'
      ctx.fillRect(b.hullX + 36, b.hullY - 16, 10, 10)
      ctx.fillRect(b.hullX + 50, b.hullY - 16, 10, 10)
      // angler
      const ax = b.hullX - 8, ay = b.hullY - 6
      ctx.fillStyle = '#e0b48c'; ctx.fillRect(ax, ay - 20, 8, 8)      // head
      ctx.fillStyle = '#c0392b'; ctx.fillRect(ax - 1, ay - 12, 10, 12) // body
      ctx.fillStyle = '#26456b'; ctx.fillRect(ax, ay, 4, 8); ctx.fillRect(ax + 5, ay, 4, 8) // legs
      // rod
      ctx.strokeStyle = '#2b1a10'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(ax + 6, ay - 8); ctx.lineTo(b.rodTipX, b.rodTipY); ctx.stroke()
      return b
    }

    function drawLine(b) {
      const hookX = g.phase === 'idle' || g.phase === 'retract' ? b.rodTipX - 6 : g.castX
      const hookY = g.phase === 'idle' ? b.rodTipY + 30 : g.hookY
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(b.rodTipX, b.rodTipY)
      if (g.phase !== 'idle' && g.phase !== 'retract') {
        ctx.lineTo(g.castX, WATER - 2) // entry point
      }
      ctx.lineTo(hookX, hookY)
      ctx.stroke()
      // hook
      ctx.strokeStyle = '#dfe6ea'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(hookX, hookY + 4, 4, Math.PI * 0.1, Math.PI * 1.5); ctx.stroke()
      return { hookX, hookY }
    }

    function drawGauge() {
      const half = g.barH / 2
      // track
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(TRACK_X - 12, TRACK_TOP - 12, 24, TRACK_H + 24)
      ctx.fillStyle = 'rgba(30,60,90,0.6)'
      ctx.fillRect(TRACK_X - 8, TRACK_TOP, 16, TRACK_H)
      // controllable catch zone
      const inZone = Math.abs(g.markerY - g.barY) <= half
      ctx.fillStyle = inZone ? 'rgba(90,230,130,0.5)' : 'rgba(90,230,130,0.28)'
      ctx.fillRect(TRACK_X - 8, g.barY - half, 16, g.barH)
      ctx.strokeStyle = '#3fd06a'; ctx.lineWidth = 2
      ctx.strokeRect(TRACK_X - 8, g.barY - half, 16, g.barH)
      // darting fish marker
      ctx.fillStyle = inZone ? '#ffffff' : '#ffd23c'
      ctx.beginPath(); ctx.arc(TRACK_X, g.markerY, 6, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath()
      ctx.moveTo(TRACK_X + 5, g.markerY)
      ctx.lineTo(TRACK_X + 12, g.markerY - 5)
      ctx.lineTo(TRACK_X + 12, g.markerY + 5)
      ctx.closePath(); ctx.fill()
      // catch meter (left of track)
      const px = TRACK_X - 26
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(px - 3, TRACK_TOP - 3, 10, TRACK_H + 6)
      ctx.fillStyle = '#0d2a17'; ctx.fillRect(px, TRACK_TOP, 4, TRACK_H)
      const ph = TRACK_H * g.progress / 100
      ctx.fillStyle = g.progress > 60 ? '#ffdf5c' : '#3fd06a'
      ctx.fillRect(px, TRACK_BOT - ph, 4, ph)
      // live catch %
      ctx.fillStyle = '#eafaff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'
      ctx.fillText(Math.round(g.progress) + '%', TRACK_X, TRACK_TOP - 18)
      ctx.textAlign = 'left'
    }

    function hint(text) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.font = '14px monospace'
      const w = ctx.measureText(text).width
      ctx.fillRect(W / 2 - w / 2 - 10, H - 40, w + 20, 24)
      ctx.fillStyle = '#eafaff'; ctx.textAlign = 'center'
      ctx.fillText(text, W / 2, H - 24); ctx.textAlign = 'left'
    }

    function rr(x, y, w, h, r) {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)
      ctx.closePath()
    }

    // Red/white float sitting where the line enters the water.
    function drawBobber(cy) {
      const cx = g.castX
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy - 11); ctx.stroke()
      ctx.fillStyle = '#e0342a'
      ctx.beginPath(); ctx.arc(cx, cy, 5, Math.PI, 0, false); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#f4f4f4'
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI, false); ctx.closePath(); ctx.fill()
    }

    // Bite cue: ripples + plunged bobber + popping "!" bubble.
    function drawBite(age) {
      const cx = g.castX
      // expanding ripple rings at the entry point
      for (let k = 0; k < 3; k++) {
        const rp = age - k * 7
        if (rp <= 0) continue
        const rad = rp * 1.7
        ctx.globalAlpha = Math.max(0, 0.5 - rp * 0.013)
        ctx.strokeStyle = '#eafcff'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.ellipse(cx, WATER, rad, rad * 0.4, 0, 0, Math.PI * 2); ctx.stroke()
      }
      ctx.globalAlpha = 1
      // bobber pulled just under the surface, twitching
      drawBobber(WATER + 7 + Math.sin(age / 2) * 1.5)
      // popping bubble with overshoot
      const pop = Math.min(1, age / 7)
      const scale = pop * (1 + (1 - pop) * 0.7)
      const bob = Math.sin(age / 5) * 3
      ctx.save()
      ctx.translate(cx, WATER - 48 + bob)
      ctx.scale(scale, scale)
      ctx.fillStyle = '#ff3b3b'
      ctx.beginPath(); ctx.moveTo(-6, 13); ctx.lineTo(6, 13); ctx.lineTo(0, 23); ctx.closePath(); ctx.fill()
      rr(-19, -19, 38, 34, 8); ctx.fill()
      ctx.strokeStyle = '#7a0f0f'; ctx.lineWidth = 2; rr(-19, -19, 38, 34, 8); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('!', 0, 0)
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
      ctx.restore()
    }

    // ---- main loop ----
    function frame() {
      t++
      // weather cycle
      if (t >= weatherNext) {
        const opts = night ? ['clear', 'clear', 'rain'] : ['clear', 'clear', 'cloudy', 'rain', 'storm']
        weather = opts[Math.floor(Math.random() * opts.length)]
        weatherSteer = weather === 'storm' ? 0.5 : weather === 'rain' ? 0.35 : 0
        weatherLuck = weather === 'storm' ? 1 : 0
        weatherNext = t + 1500 + Math.random() * 1400
      }
      if (weather === 'storm' && Math.random() < 0.006) flash = 6

      ctx.clearRect(0, 0, W, H)
      drawSky()
      drawWater()
      drawBubbles()
      drawRain()

      // update + draw swimmers
      for (const s of swimmers) {
        s.wob += 0.05
        s.yoff = Math.sin(s.wob) * 3
        if (!(g.target === s)) s.x += s.vx
        if (s.x < -80) { s.x = W + 60; s.vx = Math.abs(s.vx) }
        if (s.x > W + 80) { s.x = -60; s.vx = -Math.abs(s.vx) }
      }

      const hook = { x: g.castX, y: g.hookY }

      // phase logic
      if (g.phase === 'dropping') {
        g.hookY += 4
        if (g.hookY >= g.targetY) { g.phase = 'waiting'; g.waitStart = t; g.target = null }
      } else if (g.phase === 'waiting') {
        if (!g.target) {
          let best = null, bd = 1e9
          for (const s of swimmers) {
            const d = Math.hypot(s.x - g.castX, s.baseY - g.hookY)
            if (d < bd) { bd = d; best = s }
          }
          g.target = best
        }
        if (g.target) {
          const s = g.target
          const dx = g.castX - s.x, dy = g.hookY - s.baseY
          const d = Math.hypot(dx, dy) || 1
          const steer = 1.3 + ((upgradesRef.current && upgradesRef.current.bait) || 0) * 0.3 + weatherSteer
          s.x += (dx / d) * steer
          s.baseY += (dy / d) * steer
          s.vx = dx < 0 ? -Math.abs(s.vx) : Math.abs(s.vx)
          if (d < 16) {
            g.biteData = s.data
            g.phase = 'bite'; g.biteFlash = t
            sfx.play('bite')
            swimmers.splice(swimmers.indexOf(s), 1)
            g.target = null
          }
        }
      } else if (g.phase === 'bite') {
        if (t - g.biteFlash > 36) {
          const up = upgradesRef.current || { rod: 0, line: 0, bait: 0 }
          const df = DIFF[difficultyRef.current] || DIFF.normal
          g.phase = 'fight'
          g.progress = START_PROGRESS * df.start + up.line * 5
          g.barH = Math.max(46, 116 * df.bar + up.line * 10 - g.biteData.fight * 3) // tougher fish = smaller zone
          g.lift = LIFT + up.rod * 0.07
          g.fill = FILL * df.fill + up.rod * 0.05
          g.drain = DRAIN * df.drain
          g.markerMul = df.marker
          g.barY = (TRACK_TOP + TRACK_BOT) / 2
          g.barVel = 0
          g.markerY = (TRACK_TOP + TRACK_BOT) / 2
          g.markerTarget = g.markerY
          g.markerNext = t + 40
        }
      } else if (g.phase === 'fight') {
        const f = g.biteData.fight
        const half = g.barH / 2
        // controllable catch zone: gravity pulls it down, holding lifts it
        g.barVel += GRAV
        if (g.reeling) {
          g.barVel -= g.lift
          if (t % 7 === 0) sfx.play('reel')
        }
        g.barY += g.barVel
        if (g.barY < TRACK_TOP + half) { g.barY = TRACK_TOP + half; g.barVel = 0 }
        if (g.barY > TRACK_BOT - half) { g.barY = TRACK_BOT - half; g.barVel *= -0.3 }
        // fish darts to new spots; tougher fish dart more often
        if (t >= g.markerNext) {
          g.markerTarget = TRACK_TOP + 12 + Math.random() * (TRACK_H - 24)
          g.markerNext = t + Math.max(20, 60 + Math.random() * 70 - f * 4)
        }
        const ms = (0.4 + f * 0.1) * MARKER_SPEED * g.markerMul
        const dm = g.markerTarget - g.markerY
        g.markerY += Math.sign(dm) * Math.min(ms, Math.abs(dm))
        g.markerY = Math.max(TRACK_TOP + 6, Math.min(TRACK_BOT - 6, g.markerY))
        // fill when the zone covers the fish, drain otherwise
        const inZone = Math.abs(g.markerY - g.barY) <= half
        g.progress += inZone ? g.fill : -g.drain
        g.progress = Math.max(0, Math.min(100, g.progress))
        // hooked fish rises toward the boat as you win
        g.hookY = WATER + 12 + (1 - g.progress / 100) * (g.targetY + 18 - (WATER + 12))
        if (g.progress <= 0) finish(false)       // meter emptied — it escapes
        else if (g.progress >= 100) finish(true) // landed
      } else if (g.phase === 'retract') {
        g.hookY -= 6
        if (g.hookY <= WATER) { g.phase = 'idle'; g.biteData = null }
      }

      // draw swimmers (skip the one on the hook)
      for (const s of swimmers) {
        drawFish(ctx, s.data, s.x, s.baseY + s.yoff, s.scale, s.vx > 0, Math.sin(s.wob * 1.4))
      }

      const b = drawBoat()
      const hk = drawLine(b)

      // fish fighting on the hook
      if (g.phase === 'fight' && g.biteData) {
        const wig = Math.sin(t / 3) * 4
        drawFish(ctx, g.biteData, g.castX + wig, g.hookY + 14, fishScale(g.biteData), wig > 0, Math.sin(t / 4))
        drawGauge()
        hint('HOLD to raise the green zone — keep it over the fish')
      } else if (g.phase === 'bite') {
        drawBite(t - g.biteFlash)
      } else if (g.phase === 'idle') {
        hint('Tap the water to cast — deeper taps sink the hook lower')
      } else if (g.phase === 'waiting' || g.phase === 'dropping') {
        if (g.phase === 'waiting') drawBobber(WATER + Math.sin(t / 12) * 2)
        hint('…waiting for a bite…')
      }

      // splash / sparkle particles
      for (let i = g.parts.length - 1; i >= 0; i--) {
        const p = g.parts[i]
        p.x += p.vx; p.y += p.vy; p.vy += 0.28; p.life--
        if (p.life <= 0) { g.parts.splice(i, 1); continue }
        ctx.globalAlpha = Math.min(1, p.life / 18)
        ctx.fillStyle = p.c
        ctx.fillRect(p.x, p.y, 3, 3)
      }
      ctx.globalAlpha = 1

      drawEnv()
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${(flash / 10).toFixed(2)})`
        ctx.fillRect(0, 0, W, WATER)
        flash--
      }

      if (g.phase !== lastPhase) { lastPhase = g.phase; setUiPhase(g.phase) }

      raf = requestAnimationFrame(frame)
    }
    frame()

    // keep population up
    const pop = setInterval(() => {
      if (swimmers.length < 7) spawnSwimmer(true)
    }, 2500)

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(pop)
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [zone.id])

  const showReel = uiPhase === 'bite' || uiPhase === 'fight'
  return (
    <div ref={wrapRef} className="scene-wrap">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="scene-canvas"
        style={{ touchAction: 'none' }}
      />
      <div className="scene-actions">
        {uiPhase === 'idle' && (
          <button className="act cast" onClick={() => actionsRef.current.cast && actionsRef.current.cast()}>
            🎣 CAST
          </button>
        )}
        {showReel && (
          <button
            className="act reel"
            onPointerDown={(e) => { e.preventDefault(); actionsRef.current.reelDown && actionsRef.current.reelDown() }}
            onPointerUp={() => actionsRef.current.reelUp && actionsRef.current.reelUp()}
            onPointerLeave={() => actionsRef.current.reelUp && actionsRef.current.reelUp()}
          >
            🌀 REEL — hold!
          </button>
        )}
      </div>
    </div>
  )
}
