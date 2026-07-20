import { useEffect, useRef, useState } from 'react'
import { drawFish } from '../pixel/sprites.js'
import { fishByZone, behaviorOf, fightStyleOf, activityMul, needsDeepCast, BOSS_FISH } from '../data/fish.js'
import { RARITY } from '../data/zones.js'
import { rollSize } from '../game.js'
import { rollTrash, rollTreasure } from '../data/items.js'
import {
  drawBoat as vBoat, drawAngler as vAngler, drawRod as vRod, drawSub as vSub, P as VP,
} from './vessel.js'
import * as sfx from '../audio/sfx.js'

const TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary']

const DIFF = {
  easy: { start: 1.25, bar: 1.18, fill: 1.2, drain: 0.65, marker: 0.8 },
  normal: { start: 1, bar: 1, fill: 1, drain: 1, marker: 1 },
  hard: { start: 0.8, bar: 0.85, fill: 0.85, drain: 1.35, marker: 1.3 },
}

const W = 640
const H = 560
const PX = 4 // scenery pixel block size — sky/water/weather quantize to this
// Hard ceiling on live swimmers. Schools spawn in groups, so without this the
// population could balloon and the O(n^2) separation pass would get expensive.
const MAX_SWIMMERS = 16

const TRASH_CHANCE = 0.08
const TREASURE_CHANCE = 0.05 // rolled after trash: cast is 8% trash, 5% treasure

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b))
  return `rgb(${r},${g},${b})`
}

function lerp(a, b, f) { return Math.round(a + (b - a) * f) }

// identity helper used to phase foam along the hull without shadowing `x`
function x2(v) { return v }

function weightedPick(pool, luck = 0) {
  const draw = () => {
    const total = pool.reduce((s, f) => s + RARITY[f.rarity].weight, 0)
    let r = Math.random() * total
    for (const f of pool) { r -= RARITY[f.rarity].weight; if (r <= 0) return f }
    return pool[pool.length - 1]
  }
  let pick = draw()
  for (let i = 0; i < luck; i++) {
    const d = draw()
    if (TIERS.indexOf(d.rarity) > TIERS.indexOf(pick.rarity)) pick = d
  }
  return pick
}

function fishScale(data) {
  return 2 + Math.min(3, Math.round(data.maxSize / 70))
}

export default function Scene({ zone, onResult, upgrades, difficulty = 'normal', luck = 0, biteBonus = 0, skin = null, baitTarget = null }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const onResultRef = useRef(onResult)
  const zoneRef = useRef(zone)
  const upgradesRef = useRef(upgrades)
  const difficultyRef = useRef(difficulty)
  const luckRef = useRef(luck)
  const biteRef = useRef(biteBonus)
  const skinRef = useRef(skin)
  const baitTargetRef = useRef(baitTarget)
  const actionsRef = useRef({})
  const [uiPhase, setUiPhase] = useState('idle')
  useEffect(() => { onResultRef.current = onResult }, [onResult])
  useEffect(() => { zoneRef.current = zone }, [zone])
  useEffect(() => { upgradesRef.current = upgrades }, [upgrades])
  useEffect(() => { difficultyRef.current = difficulty }, [difficulty])
  useEffect(() => { luckRef.current = luck }, [luck])
  useEffect(() => { biteRef.current = biteBonus }, [biteBonus])
  useEffect(() => { skinRef.current = skin }, [skin])
  useEffect(() => { baitTargetRef.current = baitTarget }, [baitTarget])

  useEffect(() => {
    sfx.startAmbient()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf
    let t = 0
    let lastPhase = 'idle'

    const z = zoneRef.current
    const abyss = z.view === 'abyss'   // true deep-sea view: no sky, no boat
    const cold = !!z.cold              // ice zone: snow instead of rain
    const isWreck = !!z.wreck
    let WATER = abyss ? 46 : 200     // in the abyss the "surface" is the winch line
    let weather = 'clear', weatherNext = 0, weatherSteer = 0, weatherLuck = 0, flash = 0

    function getMoonPhase() { return (t / 40000) % 1 }
    function isSpringTide() {
      const m = getMoonPhase()
      return m < 0.1 || (m > 0.4 && m < 0.6) || m > 0.9
    }

    function daylight() {
      if (abyss) return 0.05
      return 0.5 + 0.5 * Math.sin(t / 900)
    }

    // Deterministic per-zone decorations (stable across frames).
    const biolume = []
    if (abyss) {
      for (let i = 0; i < 26; i++) {
        biolume.push({
          x: (i * 137 + 40) % W,
          y: WATER + 60 + ((i * 191) % (H - WATER - 100)),
          hue: i % 3, // 0 cyan 1 violet 2 green
          ph: (i * 0.7) % (Math.PI * 2),
        })
      }
    }

    // Swimming fish population.
    const swimmers = []
    function spawnSwimmer(offscreen) {
      const pool = fishByZone(zoneRef.current.id)
      if (!pool.length) return
      const bait = (upgradesRef.current && upgradesRef.current.bait) || 0
      // relic luck adds fractional extra rarity re-rolls on top of bait/weather
      const relicLuck = luckRef.current || 0
      const extra = Math.floor(relicLuck) + (Math.random() < relicLuck % 1 ? 1 : 0) + (isSpringTide() ? 1 : 0)
      let data = weightedPick(pool, bait + weatherLuck + extra)
      // Time of day / weather now gate species, not just bite speed. Reroll
      // against the activity multiplier so night, storms and daylight each
      // surface a different slice of the roster.
      const d0 = daylight()
      for (let tries = 0; tries < 3; tries++) {
        const m = activityMul(data, d0, weather)
        if (m >= 1 || Math.random() < m) break
        data = weightedPick(pool, bait + weatherLuck + extra)
      }
      // bait that matches a species' behavior class pulls it in preferentially
      const tgt = baitTargetRef.current
      if (tgt && behaviorOf(data) !== tgt) {
        const alt = weightedPick(pool, bait + weatherLuck + extra)
        if (behaviorOf(alt) === tgt) data = alt
      }
      const dir = Math.random() < 0.5 ? -1 : 1
      const behavior = behaviorOf(data)
      const deep = H - WATER
      // bottom-dwellers hug the seabed; everything else uses the full column
      const baseY = behavior === 'bottom'
        ? WATER + deep * 0.72 + Math.random() * (deep * 0.22)
        : WATER + 46 + Math.random() * (deep - 90)
      const x0 = offscreen ? (dir === 1 ? -60 : W + 60) : 60 + Math.random() * (W - 120)
      const mk = (ox2, oy2, leader) => ({
        data, behavior,
        x: x0 + ox2,
        baseY: Math.max(WATER + 30, Math.min(H - 20, baseY + oy2)),
        yoff: 0,
        vx: dir * (0.3 + Math.random() * 0.5) * (behavior === 'predator' ? 1.5 : 1),
        wob: Math.random() * Math.PI * 2,
        scale: fishScale(data),
        targeted: false,
        leader,
      })
      const lead = mk(0, 0, null)
      swimmers.push(lead)
      // shoaling species arrive as a loose group that follows one leader
      if (behavior === 'school') {
        const n = 3 + Math.floor(Math.random() * 4)
        for (let i = 0; i < n && swimmers.length < MAX_SWIMMERS; i++) {
          swimmers.push(mk((Math.random() - 0.5) * 70, (Math.random() - 0.5) * 44, lead))
        }
      }
    }
    for (let i = 0; i < (abyss ? 8 : 7); i++) spawnSwimmer(false)

    // Game state.
    const g = {
      phase: 'idle', // idle | dropping | waiting | bite | fight | retract
      castX: 250,
      hookY: WATER,
      targetY: 320,
      reeling: false,
      target: null,   // swimmer being lured
      biteData: null, // fish (or item) on the hook
      special: null,  // trash/treasure rolled for this cast
      specialAt: 0,
      progress: 0,
      tension: 0,
      biteFlash: 0,
      waitStart: 0,
      lift: 0.6,   // set for real at fight start from upgrades + difficulty
      fill: 0.95,
      drain: 0.3,
      markerMul: 1,
      parts: [],
      shake: 0,
      hole: null,
      snagged: false,
      snagTimer: 0,
    }

    // ---- reel-gauge tuning ----
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

    // Boat (surface) or submersible (abyss) anchor.
    function anchor() {
      if (abyss) {
        const bob = Math.sin(t / 55) * 2
        return { hullX: 470, hullY: 60 + bob, rodTipX: 470, rodTipY: 96 + bob, bob }
      }
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
      if (zoneRef.current.id === 'ice' && !g.hole) {
        g.hole = { x: Math.max(110, Math.min(430, px)) }
        sfx.resume(); sfx.play('hit')
        return
      }
      const cx = zoneRef.current.id === 'ice' ? g.hole.x : px
      g.castX = abyss ? Math.max(80, Math.min(440, cx)) : Math.max(110, Math.min(430, cx))
      g.targetY = Math.max(WATER + 60, Math.min(H - 46, py < WATER + 60 ? 320 : py))
      g.hookY = WATER
      g.phase = 'dropping'
      // roll a non-fish catch for this cast
      const r = Math.random()
      g.special = r < TRASH_CHANCE ? rollTrash() : r < TRASH_CHANCE + TREASURE_CHANCE ? rollTreasure() : null
      sfx.resume(); sfx.play('cast')
      if (!abyss) spawnRipple(g.castX)
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

    actionsRef.current.cast = () => {
      if (g.phase === 'idle') { sfx.resume(); doCast(g.castX || 260, g.targetY || 360) }
    }
    actionsRef.current.triggerBoss = () => {
      if (g.phase === 'idle') {
        sfx.resume();
        g.biteData = BOSS_FISH;
        g.phase = 'bite';
        g.biteFlash = t;
        sfx.play('bite');
      }
    }
    actionsRef.current.reelDown = () => { if (g.phase === 'fight' || g.phase === 'bite') g.reeling = true }
    actionsRef.current.reelUp = () => { g.reeling = false }

    function onKeyDown(e) {
      if (e.code === 'Space' && uiPhase === 'idle' && !e.repeat) {
        e.preventDefault()
        if (g.phase === 'idle') { sfx.resume(); doCast(g.castX || 250, g.targetY || 320) }
        else if (g.phase === 'fight' || g.phase === 'bite') g.reeling = true
      }
    }
    function onKeyUp(e) {
      if (e.code === 'Space') g.reeling = false
    }

    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    function finish(landed) {
      const data = g.biteData
      const size = data.kind ? 0 : rollSize(data)
      if (data.kind === 'treasure') sfx.play(landed ? 'treasure' : 'escape')
      else if (data.kind === 'trash') sfx.play('trash')
      else sfx.play(landed ? 'catch' : 'escape')
      if (landed) { spawnSplash(); spawnBurst(g.castX, g.hookY); g.shake = data.kind === 'treasure' ? 16 : 10 }
      else g.shake = 7
      onResultRef.current && onResultRef.current(data, size, landed)
      g.phase = 'retract'
      g.target = null
      g.special = null
    }

    function spawnSplash() {
      const sy = abyss ? g.hookY : WATER
      for (let i = 0; i < 18; i++) {
        g.parts.push({
          x: g.castX, y: sy,
          vx: (Math.random() - 0.5) * 5,
          vy: -2 - Math.random() * 5,
          life: 26 + Math.random() * 22,
          c: i % 3 === 0 ? '#ffd23c' : '#eafcff',
        })
      }
    }

    function spawnBurst(x, y) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2
        g.parts.push({
          x, y,
          vx: Math.cos(a) * (1.5 + Math.random() * 2),
          vy: Math.sin(a) * (1.5 + Math.random() * 2) - 1,
          life: 20 + Math.random() * 16,
          c: i % 2 === 0 ? '#ffd23c' : '#aef1ff',
        })
      }
    }

    function spawnRipple(x) {
      for (let i = 0; i < 6; i++) {
        g.parts.push({
          x: x + (Math.random() - 0.5) * 10, y: WATER,
          vx: (Math.random() - 0.5) * 2.5, vy: -1 - Math.random() * 2.5,
          life: 16 + Math.random() * 12, c: '#eafcff',
        })
      }
    }

    // ---- drawing helpers ----
    function drawSky() {
      const d = daylight()
      const topDay = [143, 208, 239], topNight = [10, 18, 48]
      const botDay = [217, 240, 247], botNight = [22, 36, 74]
      // Posterized sky: discrete bands instead of a smooth gradient, so the
      // background matches the pixel sprites instead of looking airbrushed.
      const BANDS = 7
      for (let i = 0; i < BANDS; i++) {
        const f = i / (BANDS - 1)
        const r = lerp(lerp(topNight[0], topDay[0], d), lerp(botNight[0], botDay[0], d), f)
        const g2 = lerp(lerp(topNight[1], topDay[1], d), lerp(botNight[1], botDay[1], d), f)
        const b2 = lerp(lerp(topNight[2], topDay[2], d), lerp(botNight[2], botDay[2], d), f)
        const y0 = Math.round((WATER * i) / BANDS / PX) * PX
        const y1 = Math.round((WATER * (i + 1)) / BANDS / PX) * PX
        ctx.fillStyle = `rgb(${r},${g2},${b2})`
        ctx.fillRect(0, y0, W, y1 - y0)
      }
      if (d < 0.4) {
        ctx.globalAlpha = (0.4 - d) / 0.4
        ctx.fillStyle = '#ffffff'
        for (let i = 0; i < 44; i++) {
          const sx = Math.round(((i * 97) % W) / PX) * PX
          const sy = Math.round(((i * 53) % (WATER - 30)) / PX) * PX
          if ((i * 7 + Math.floor(t / 30)) % 11 < 8) ctx.fillRect(sx, sy, PX, PX)
        }
        ctx.globalAlpha = 1
      }
      // sun / moon as stepped pixel discs
      ctx.globalAlpha = Math.max(0, d) * 0.18
      pxDisc(84, 56, 44, '#fff3b0')
      ctx.globalAlpha = Math.max(0, d)
      pxDisc(84, 56, 28, '#fff3b0')
      pxDisc(78, 48, 10, '#fffce0')
      ctx.globalAlpha = Math.max(0, 1 - d) * 0.9
      pxDisc(W - 84, 56, 22, '#dfe6ff')
      
      const mp = getMoonPhase()
      const shadowX = (W - 84) - Math.cos(mp * Math.PI * 2) * 26
      ctx.globalCompositeOperation = 'source-atop'
      pxDisc(shadowX, 56, 22, '#101830')
      ctx.globalCompositeOperation = 'source-over'
      
      ctx.globalAlpha = Math.max(0, 1 - d) * 0.55
      pxDisc(W - 76, 50, 8, '#b9c4e8')
      ctx.globalAlpha = 1
      // chunky stepped clouds
      const cloudCol = `rgba(255,255,255,${(0.3 + 0.55 * d).toFixed(2)})`
      const nClouds = weather === 'clear' ? 3 : 5
      for (let i = 0; i < nClouds; i++) {
        let cx = (i * 150 - t * 0.25) % (W + 200); if (cx < -200) cx += W + 200
        pxCloud(cx, 24 + (i % 3) * 26, 3 + (i % 3), cloudCol)
      }
      if (weather === 'storm' || weather === 'blizzard') { ctx.fillStyle = 'rgba(8,10,22,0.4)'; ctx.fillRect(0, 0, W, WATER) }
      // stepped snowy peaks for the fjord
      if (cold) {
        pxMountain(60, WATER, 90, 70, 'rgba(210,225,240,0.9)', '#ffffff')
        pxMountain(180, WATER, 130, 100, 'rgba(198,215,232,0.92)', '#ffffff')
        pxMountain(320, WATER, 70, 60, 'rgba(160,180,200,0.75)', '#e8f2ff')
      }
    }

    // ---- pixel scenery helpers ----
    // Everything below quantizes to PX-sized blocks so the backdrop reads as
    // pixel art rather than smooth vector shapes.
    function pxDisc(cx, cy, r, color) {
      ctx.fillStyle = color
      for (let y = -r; y <= r; y += PX) {
        const half = Math.sqrt(Math.max(0, r * r - y * y))
        const x0 = Math.round((cx - half) / PX) * PX
        const w = Math.max(PX, Math.round((half * 2) / PX) * PX)
        ctx.fillRect(x0, Math.round((cy + y) / PX) * PX, w, PX)
      }
    }
    function pxCloud(x, y, puffs, color) {
      ctx.fillStyle = color
      const bx = Math.round(x / PX) * PX, by = Math.round(y / PX) * PX
      // base slab
      ctx.fillRect(bx, by, PX * (8 + puffs * 3), PX * 3)
      // stepped bumps on top
      for (let i = 0; i < puffs; i++) {
        const w = PX * (3 + (i % 2))
        ctx.fillRect(bx + PX * (2 + i * 3), by - PX * 2, w, PX * 2)
        if (i % 2 === 0) ctx.fillRect(bx + PX * (3 + i * 3), by - PX * 3, PX * 2, PX)
      }
      // underside shade
      ctx.fillStyle = 'rgba(150,175,200,0.28)'
      ctx.fillRect(bx, by + PX * 2, PX * (8 + puffs * 3), PX)
    }
    function pxMountain(cx, baseY, w, h, body, cap) {
      const steps = Math.round(h / (PX * 2))
      for (let i = 0; i < steps; i++) {
        const f = i / steps
        const ww = Math.round((w * (1 - f)) / PX) * PX
        const y = Math.round((baseY - i * PX * 2) / PX) * PX
        ctx.fillStyle = i > steps * 0.72 ? cap : body
        ctx.fillRect(Math.round((cx - ww / 2) / PX) * PX, y - PX * 2, ww, PX * 2)
      }
    }

    function drawPrecip() {
      if (weather === 'rain' || weather === 'storm') {
        // pixel dashes rather than stroked diagonal lines
        const n = weather === 'storm' ? 130 : 70
        ctx.fillStyle = 'rgba(180,210,240,0.55)'
        for (let i = 0; i < n; i++) {
          const x = Math.round((((i * 73 + t * 6) % (W + 40)) - 20) / PX) * PX
          const y = Math.round(((i * 137 + t * 15) % (WATER + 40)) / PX) * PX
          ctx.fillRect(x, y, PX, PX * 2)
          ctx.fillRect(x - PX, y + PX * 2, PX, PX)
        }
      } else if (weather === 'snow' || weather === 'blizzard') {
        const n = weather === 'blizzard' ? 120 : 60
        ctx.fillStyle = 'rgba(240,248,255,0.85)'
        for (let i = 0; i < n; i++) {
          const x = Math.round((((i * 89 + t * (weather === 'blizzard' ? 4 : 1.2) + Math.sin(t / 30 + i) * 14) % (W + 20)) - 10) / PX) * PX
          const y = Math.round(((i * 151 + t * (weather === 'blizzard' ? 6 : 2.5)) % (WATER + 30)) / PX) * PX
          ctx.fillRect(x, y, PX, PX)
        }
      }
    }

    // Full-canvas deep-sea backdrop: gradient, seafloor, marine snow, glow critters.
    function drawAbyss() {
      const base = zoneRef.current.bg
      const grd = ctx.createLinearGradient(0, 0, 0, H)
      grd.addColorStop(0, shade(base, 14))
      grd.addColorStop(0.5, shade(base, -18))
      grd.addColorStop(1, '#020409')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, W, H)

      // rocky seafloor silhouette
      ctx.fillStyle = 'rgba(4,8,14,0.9)'
      ctx.beginPath()
      ctx.moveTo(0, H)
      for (let x = 0; x <= W; x += 40) {
        const y = H - 26 - Math.abs(Math.sin(x * 0.71)) * 26
        ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill()

      // hydrothermal vent smoke wisps
      ctx.globalAlpha = 0.08; ctx.fillStyle = '#8aa0b8'
      for (let i = 0; i < 3; i++) {
        const vx = 120 + i * 190
        const wob = Math.sin(t / 60 + i * 2) * 12
        ctx.beginPath()
        ctx.ellipse(vx + wob, H - 70 - (t * 0.4 + i * 60) % 160, 14, 34, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // sunken wreck silhouette
      if (isWreck) {
        ctx.fillStyle = 'rgba(6,10,18,0.95)'
        const wx = 60, wy = H - 60
        ctx.beginPath()
        ctx.moveTo(wx, wy)
        ctx.lineTo(wx + 40, wy - 90)     // bow rising
        ctx.lineTo(wx + 70, wy - 88)
        ctx.lineTo(wx + 90, wy - 30)
        ctx.lineTo(wx + 250, wy - 38)    // deck
        ctx.lineTo(wx + 280, wy)
        ctx.closePath(); ctx.fill()
        // broken masts
        ctx.strokeStyle = 'rgba(6,10,18,0.95)'; ctx.lineWidth = 6
        ctx.beginPath(); ctx.moveTo(wx + 150, wy - 36); ctx.lineTo(wx + 130, wy - 130); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(wx + 210, wy - 38); ctx.lineTo(wx + 226, wy - 90); ctx.stroke()
        // portholes glow faintly
        ctx.fillStyle = 'rgba(95,211,255,0.16)'
        for (let i = 0; i < 4; i++) {
          ctx.beginPath(); ctx.arc(wx + 110 + i * 34, wy - 16, 4, 0, Math.PI * 2); ctx.fill()
        }
      }

      // marine snow — slow drifting specks
      ctx.fillStyle = 'rgba(210,225,240,0.35)'
      for (let i = 0; i < 46; i++) {
        const x = (i * 83 + Math.sin(t / 90 + i) * 16) % W
        const y = (i * 127 + t * (0.2 + (i % 3) * 0.12)) % H
        ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1)
      }

      // bioluminescent critters — pulsing glow dots
      for (const b of biolume) {
        const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 45 + b.ph))
        const col = b.hue === 0 ? '95,211,255' : b.hue === 1 ? '181,108,255' : '95,240,170'
        ctx.fillStyle = `rgba(${col},${(0.5 * pulse).toFixed(2)})`
        ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = `rgba(${col},${(0.12 * pulse).toFixed(2)})`
        ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill()
      }
    }

    function drawEnv() {
      const d = daylight()
      const tod = abyss ? (isWreck ? 'Wreck' : 'Abyss') : d > 0.72 ? 'Day' : d > 0.4 ? 'Dusk' : 'Night'
      const icon = abyss ? '🌑'
        : weather === 'rain' ? '🌧' : weather === 'storm' ? '⛈'
        : weather === 'snow' ? '🌨' : weather === 'blizzard' ? '❄'
        : weather === 'cloudy' ? '☁' : (d > 0.4 ? '☀' : '🌙')
      const label = `${icon} ${tod}`
      ctx.font = '13px monospace'
      const w = ctx.measureText(label).width
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(W - w - 20, 10, w + 14, 22)
      ctx.fillStyle = '#eafaff'; ctx.fillText(label, W - w - 13, 25)
    }

    function drawWater() {
      const base = zoneRef.current.bg
      // Depth as discrete posterized bands — no gradient.
      const BANDS = 9
      for (let i = 0; i < BANDS; i++) {
        const f = i / (BANDS - 1)
        const y0 = Math.round((WATER + (H - WATER) * (i / BANDS)) / PX) * PX
        const y1 = Math.round((WATER + (H - WATER) * ((i + 1) / BANDS)) / PX) * PX
        ctx.fillStyle = shade(base, Math.round(28 - f * 84))
        ctx.fillRect(0, y0, W, y1 - y0)
      }
      // caustic light shafts as stepped blocks
      ctx.globalAlpha = 0.07
      ctx.fillStyle = '#eafcff'
      for (let i = 0; i < 5; i++) {
        const rx = 40 + i * 130 + Math.sin(t / 90 + i) * 12
        const rows = Math.ceil((H - WATER) / (PX * 3))
        for (let r = 0; r < rows; r++) {
          const y = WATER + r * PX * 3
          const spread = 40 + r * 2.2
          ctx.fillRect(Math.round((rx - r * 0.6) / PX) * PX, y, Math.round(spread / PX) * PX, PX * 3)
        }
      }
      ctx.globalAlpha = 1
      // surface crest as quantized foam blocks instead of stroked sine curves
      for (let layer = 0; layer < 2; layer++) {
        ctx.fillStyle = layer === 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)'
        for (let x = 0; x <= W; x += PX) {
          const raw = WATER + layer * PX + Math.sin(x / 26 + t / 22 + layer) * 4
          ctx.fillRect(x, Math.round(raw / PX) * PX, PX, PX)
        }
      }
      // full 2-layer scrolling caustics pattern below waterline
      for (let layer = 0; layer < 2; layer++) {
        ctx.fillStyle = layer === 0 ? shade(base, 25) : shade(base, 46)
        ctx.globalAlpha = layer === 0 ? 0.3 : 0.6
        const speed = layer === 0 ? t / 14 : -t / 26
        const scale = layer === 0 ? 40 : 30
        for (let y = WATER + PX * 2; y < H; y += PX * 4) {
          for (let x = 0; x <= W; x += PX * 3) {
            const rx = x + Math.sin(y / scale + speed) * (PX * 4)
            if ((Math.floor(rx / (PX * 3)) + Math.floor(y / (PX * 4))) % 4 < 2) {
              ctx.fillRect(Math.round(rx / PX) * PX, y, PX * 3, PX * 2)
            }
          }
        }
      }
      ctx.globalAlpha = 1
      if (g.hole) {
        ctx.fillStyle = 'rgba(10, 20, 30, 0.8)'
        ctx.beginPath(); ctx.ellipse(g.hole.x, WATER, 16, 4, 0, 0, Math.PI * 2); ctx.fill()
      }
      // drifting ice floes on the fjord
      if (cold) {
        ctx.fillStyle = 'rgba(225,238,248,0.92)'
        for (let i = 0; i < 4; i++) {
          let fx = (i * 190 + t * 0.18) % (W + 140) - 70
          const fw = 60 + (i % 3) * 26
          const fy = WATER - 4 + Math.sin(t / 50 + i * 2) * 2
          ctx.beginPath()
          ctx.moveTo(fx, fy); ctx.lineTo(fx + fw, fy)
          ctx.lineTo(fx + fw - 10, fy + 10); ctx.lineTo(fx + 8, fy + 10)
          ctx.closePath(); ctx.fill()
        }
      }
      // coral for the reef
      if (zoneRef.current.id === 'reef') {
        const corals = [
          [60, '#c95d7a'], [150, '#e8a13c'], [300, '#b56cff'], [420, '#3fae9c'], [560, '#e0563c'],
        ]
        for (const [cx, cc] of corals) {
          ctx.fillStyle = cc
          ctx.globalAlpha = 0.55
          const sw = Math.sin(t / 55 + cx) * 3
          ctx.fillRect(cx, H - 34, 8, 34)
          ctx.fillRect(cx - 10 + sw, H - 52, 6, 30)
          ctx.fillRect(cx + 12 + sw, H - 46, 6, 26)
          ctx.globalAlpha = 1
        }
      }
    }

    function drawBubbles() {
      ctx.fillStyle = 'rgba(255,255,255,0.38)'
      for (let i = 0; i < 16; i++) {
        const bx = Math.round(((i * 61 + Math.sin(t / 40 + i) * 10) % W) / PX) * PX
        const by = Math.round((H - ((t * (0.6 + (i % 4) * 0.2) + i * 90) % (H - WATER)) - 4) / PX) * PX
        const s = PX * (1 + (i % 2))
        ctx.fillRect(bx, by, s, s)
      }
    }

    // Pixel-art trawler + angler + bending rod (src/scene/vessel.js).
    // Replaces the old vector-polygon boat, whose smooth diagonals clashed with
    // the pixel fish. Returns the rod tip so drawLine can anchor to it.
    const BOAT_CX = 452
    function drawBoat() {
      const bob = Math.sin(t / 40) * 3
      // gentle see-saw, offset from the bob so the boat pitches as it rises
      const tilt = Math.sin(t / 40 + 0.7) * 0.05
      // waterline sits at art row 10, so oy must be WATER - 10*P for the hull
      // to float at the surface instead of on top of it
      const cy = WATER - 10 * VP + bob
      const isNight = daylight() < 0.42

      const st = vBoat(ctx, { cx: BOAT_CX, cy, t, night: isNight, tilt, moving: true, skin: skinRef.current })

      const pose =
        g.phase === 'fight' || g.phase === 'bite' ? 'reel'
        : g.phase === 'dropping' ? 'cast'
        : 'idle'
      const a = vAngler(ctx, {
        ox: st.ox, oy: st.oy, gx: 14, gy: -13, tilt, pivot: st.pivot, pose, t,
      })

      // rod loads up under a fighting fish, and harder while actively reeling
      const bend =
        g.phase === 'fight' ? (g.reeling ? 0.95 : 0.62)
        : g.phase === 'bite' ? 0.34
        : 0.06
      vRod(ctx, {
        ox: st.ox, oy: st.oy,
        gripX: a.hand.x, gripY: a.hand.y,
        tipX: a.tip.x, tipY: a.tip.y,
        bend, tilt, pivot: st.pivot,
      })

      // The water band is painted BEFORE the boat, so without this the hull
      // would sit on top of the surface. Wash a translucent strip back over the
      // keel, then foam along the contact line, so the boat reads as floating.
      const hullL = st.ox - 2
      const hullW = 62 * VP + 4
      ctx.globalAlpha = 0.5
      ctx.fillStyle = shade(zoneRef.current.bg, 26)
      ctx.fillRect(hullL, WATER, hullW, 14)
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(234,252,255,0.85)'
      for (let i = 0; i < 22; i++) {
        const fx = hullL + 6 + i * (hullW / 22)
        const fy = WATER - 1 + Math.round(Math.sin(x2(fx) / 9 + t / 14) * 1.6)
        ctx.fillRect(Math.round(fx), fy, 3, 2)
      }

      // convert the art-unit rod tip to canvas px, including the tilt shear
      const shear = Math.round((a.tip.x - st.pivot) * tilt)
      return {
        hullX: BOAT_CX,
        hullY: st.oy,
        rodTipX: st.ox + a.tip.x * VP,
        rodTipY: st.oy + (a.tip.y + shear) * VP,
        bob,
      }
    }

    // Pixel-art research submersible (src/scene/vessel.js). Replaces the old
    // vector-polygon sub so the abyss matches the pixel-quantized water.
    function drawSub() {
      const bob = Math.sin(t / 55) * 2
      const tilt = Math.sin(t / 62 + 0.4) * 0.035
      const a = anchor()
      // headlight tracks the hook once a cast is out, otherwise sweeps ahead
      const aiming = g.phase !== 'idle' && g.phase !== 'retract'
      const aimX = aiming ? g.castX : a.hullX - 150 + Math.sin(t / 90) * 40
      const aimY = aiming ? Math.max(a.hullY + 90, g.hookY) : a.hullY + 260
      return vSub(ctx, {
        cx: a.hullX, cy: a.hullY + bob, t, tilt,
        aimX, aimY, lightOn: true,
      })
    }

    function drawLine(b) {
      const hookX = g.phase === 'idle' || g.phase === 'retract' ? b.rodTipX - 6 : g.castX
      const hookY = g.phase === 'idle' ? b.rodTipY + 30 : g.hookY
      ctx.strokeStyle = abyss ? 'rgba(180,220,255,0.55)' : 'rgba(255,255,255,0.75)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(b.rodTipX, b.rodTipY)
      if (!abyss && g.phase !== 'idle' && g.phase !== 'retract') {
        ctx.lineTo(g.castX, WATER - 2) // entry point at the surface
      }
      ctx.lineTo(hookX, hookY)
      ctx.stroke()
      ctx.strokeStyle = '#dfe6ea'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(hookX, hookY + 4, 4, Math.PI * 0.1, Math.PI * 1.5); ctx.stroke()
      // glowing lure in the dark
      if (abyss && g.phase !== 'idle' && g.phase !== 'retract') {
        const pulse = 0.5 + 0.5 * Math.sin(t / 14)
        ctx.fillStyle = `rgba(191,255,224,${(0.7 * pulse + 0.2).toFixed(2)})`
        ctx.beginPath(); ctx.arc(hookX, hookY - 3, 3, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = `rgba(191,255,224,${(0.16 * pulse).toFixed(2)})`
        ctx.beginPath(); ctx.arc(hookX, hookY - 3, 11, 0, Math.PI * 2); ctx.fill()
      }
      return { hookX, hookY }
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

    function drawGauge() {
      const half = g.barH / 2
      // track
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      rr(TRACK_X - 14, TRACK_TOP - 14, 28, TRACK_H + 28, 8); ctx.fill()
      const tg = ctx.createLinearGradient(0, TRACK_TOP, 0, TRACK_BOT)
      tg.addColorStop(0, 'rgba(40,80,120,0.6)')
      tg.addColorStop(1, 'rgba(16,34,52,0.6)')
      ctx.fillStyle = tg
      ctx.fillRect(TRACK_X - 8, TRACK_TOP, 16, TRACK_H)
      // controllable catch zone
      const inZone = Math.abs(g.markerY - g.barY) <= half
      const zg = ctx.createLinearGradient(0, g.barY - half, 0, g.barY + half)
      zg.addColorStop(0, inZone ? 'rgba(120,240,150,0.65)' : 'rgba(90,230,130,0.34)')
      zg.addColorStop(1, inZone ? 'rgba(60,190,110,0.65)' : 'rgba(50,170,100,0.34)')
      ctx.fillStyle = zg
      ctx.fillRect(TRACK_X - 8, g.barY - half, 16, g.barH)
      ctx.save()
      if (inZone) { ctx.shadowColor = '#3fd06a'; ctx.shadowBlur = 10 }
      ctx.strokeStyle = '#3fd06a'; ctx.lineWidth = 2
      ctx.strokeRect(TRACK_X - 8, g.barY - half, 16, g.barH)
      ctx.restore()
      // darting fish marker
      ctx.save()
      ctx.shadowColor = inZone ? '#ffffff' : '#ffd23c'; ctx.shadowBlur = 8
      ctx.fillStyle = inZone ? '#ffffff' : '#ffd23c'
      ctx.beginPath(); ctx.arc(TRACK_X, g.markerY, 6, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath()
      ctx.moveTo(TRACK_X + 5, g.markerY)
      ctx.lineTo(TRACK_X + 12, g.markerY - 5)
      ctx.lineTo(TRACK_X + 12, g.markerY + 5)
      ctx.closePath(); ctx.fill()
      ctx.restore()
      // catch meter (left of track)
      const px = TRACK_X - 26
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(px - 4, TRACK_TOP - 4, 12, TRACK_H + 8, 4); ctx.fill()
      ctx.fillStyle = '#0d2a17'; ctx.fillRect(px, TRACK_TOP, 4, TRACK_H)
      const ph = TRACK_H * g.progress / 100
      const mg = ctx.createLinearGradient(0, TRACK_BOT - ph, 0, TRACK_BOT)
      mg.addColorStop(0, g.progress > 60 ? '#ffdf5c' : '#6fe88a')
      mg.addColorStop(1, g.progress > 60 ? '#e8a13c' : '#2f9d4e')
      ctx.fillStyle = mg
      ctx.fillRect(px, TRACK_BOT - ph, 4, ph)
      // --- line tension bar, right of the track ---
      // Turns the fight from "hold the button" into "know when to ease off".
      const tx = TRACK_X + 18
      const tf = (g.tension || 0) / (g.snapAt || 100)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(tx - 4, TRACK_TOP - 4, 12, TRACK_H + 8, 4); ctx.fill()
      ctx.fillStyle = '#2a1010'; ctx.fillRect(tx, TRACK_TOP, 4, TRACK_H)
      const th = TRACK_H * tf
      ctx.fillStyle = tf > 0.82 ? '#ff3b3b' : tf > 0.55 ? '#ffa53c' : '#5fd3ff'
      ctx.fillRect(tx, TRACK_BOT - th, 4, th)
      // danger zone marker
      ctx.fillStyle = 'rgba(255,59,59,0.85)'
      ctx.fillRect(tx - 2, TRACK_BOT - TRACK_H * 0.82, 8, 2)
      if (tf > 0.82 && Math.floor(t / 6) % 2 === 0) {
        ctx.fillStyle = '#ff3b3b'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'
        ctx.fillText('EASE!', tx + 2, TRACK_TOP - 34); ctx.textAlign = 'left'
      }

      // live catch %
      ctx.fillStyle = '#eafaff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'
      ctx.fillText(Math.round(g.progress) + '%', TRACK_X, TRACK_TOP - 20)
      ctx.textAlign = 'left'
      if (g.snagged) {
        ctx.fillStyle = '#ff3b3b'
        ctx.fillRect(TRACK_X - 35, TRACK_TOP + TRACK_H / 2 - 14, 70, 28)
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'
        ctx.fillText('SNAG!', TRACK_X, TRACK_TOP + TRACK_H / 2 - 2)
        ctx.fillText('TAP!', TRACK_X, TRACK_TOP + TRACK_H / 2 + 10)
        ctx.textAlign = 'left'
      }
    }

    function hint(text) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.font = '14px monospace'
      const w = ctx.measureText(text).width
      ctx.fillRect(W / 2 - w / 2 - 10, H - 40, w + 20, 24)
      ctx.fillStyle = '#eafaff'; ctx.textAlign = 'center'
      ctx.fillText(text, W / 2, H - 24); ctx.textAlign = 'left'
    }

    // Red/white float sitting where the line enters the water (surface zones).
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
    // In the abyss the cue happens at the hook, not the surface.
    function drawBite(age) {
      const cx = g.castX
      const cueY = abyss ? g.hookY : WATER
      for (let k = 0; k < 3; k++) {
        const rp = age - k * 7
        if (rp <= 0) continue
        const rad = rp * 1.7
        ctx.globalAlpha = Math.max(0, 0.5 - rp * 0.013)
        ctx.strokeStyle = abyss ? '#9fe8ff' : '#eafcff'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.ellipse(cx, cueY, rad, abyss ? rad : rad * 0.4, 0, 0, Math.PI * 2); ctx.stroke()
      }
      ctx.globalAlpha = 1
      if (!abyss) drawBobber(WATER + 7 + Math.sin(age / 2) * 1.5)
      const pop = Math.min(1, age / 7)
      const scale = pop * (1 + (1 - pop) * 0.7)
      const bob = Math.sin(age / 5) * 3
      ctx.save()
      ctx.translate(cx, (abyss ? g.hookY - 50 : WATER - 48) + bob)
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
      WATER = abyss ? 46 : 200 + Math.sin(t / 1400) * 6
      // weather cycle (surface zones only)
      if (!abyss && t >= weatherNext) {
        const opts = cold
          ? ['clear', 'clear', 'cloudy', 'snow', 'snow', 'blizzard']
          : ['clear', 'clear', 'cloudy', 'rain', 'storm']
        weather = opts[Math.floor(Math.random() * opts.length)]
        weatherSteer = weather === 'storm' || weather === 'blizzard' ? 0.5 : weather === 'rain' || weather === 'snow' ? 0.35 : 0
        weatherLuck = weather === 'storm' || weather === 'blizzard' ? 1 : 0
        weatherNext = t + 1500 + Math.random() * 1400
      }
      if (weather === 'storm' && Math.random() < 0.006) flash = 6

      ctx.clearRect(0, 0, W, H)
      ctx.save()
      if (g.shake > 0) {
        const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const m = noMotion ? 0 : Math.min(5, g.shake * 0.5)
        ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m)
        g.shake--
      }

      if (abyss) {
        drawAbyss()
      } else {
        drawSky()
        drawWater()
        drawPrecip()
      }
      drawBubbles()

      // update swimmers
      for (let si = swimmers.length - 1; si >= 0; si--) {
        const s = swimmers[si]
        s.wob += 0.05
        s.yoff = Math.sin(s.wob) * 3

        // --- behavior steering (skipped for the fish being lured to the hook) ---
        if (g.target !== s) {
          if (s.behavior === 'school' && s.leader && swimmers.includes(s.leader)) {
            // cohesion toward the leader plus separation from close neighbours
            const L = s.leader
            const dx = L.x - s.x, dy = L.baseY - s.baseY
            const d = Math.hypot(dx, dy) || 1
            if (d > 26) { s.x += (dx / d) * 0.55; s.baseY += (dy / d) * 0.35 }
            for (const o of swimmers) {
              if (o === s || o.leader !== s.leader) continue
              const ox2 = s.x - o.x, oy2 = s.baseY - o.baseY
              const od = Math.hypot(ox2, oy2)
              if (od > 0 && od < 16) { s.x += (ox2 / od) * 0.4; s.baseY += (oy2 / od) * 0.3 }
            }
            s.vx = L.vx
          } else if (s.behavior === 'predator') {
            // hunt the nearest meaningfully smaller swimmer
            let prey = null, pd = 190
            for (const o of swimmers) {
              if (o === s || o.behavior === 'predator') continue
              if (o.data.maxSize > s.data.maxSize * 0.55) continue
              const dd = Math.hypot(o.x - s.x, o.baseY - s.baseY)
              if (dd < pd) { pd = dd; prey = o }
            }
            if (prey) {
              const dx = prey.x - s.x, dy = prey.baseY - s.baseY
              const d = Math.hypot(dx, dy) || 1
              s.x += (dx / d) * 0.9
              s.baseY += (dy / d) * 0.5
              s.vx = dx < 0 ? -Math.abs(s.vx) : Math.abs(s.vx)
              // eaten: prey vanishes in a puff, predator keeps moving
              if (d < 13) {
                if (g.target === prey) g.target = null
                for (let k = 0; k < 7; k++) {
                  g.parts.push({
                    x: prey.x, y: prey.baseY,
                    vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
                    life: 14 + Math.random() * 10, c: '#dff2ff',
                  })
                }
                swimmers.splice(swimmers.indexOf(prey), 1)
              }
            } else s.x += s.vx
          } else {
            s.x += s.vx
          }

          // benthic species never leave the lower column
          if (s.behavior === 'bottom') {
            const floorY = H - 26, ceilY = WATER + (H - WATER) * 0.62
            if (s.baseY > floorY) s.baseY = floorY
            if (s.baseY < ceilY) s.baseY += 0.5
          }
          s.baseY = Math.max(WATER + 24, Math.min(H - 16, s.baseY))
        }

        if (s.x < -80) { s.x = W + 60; s.vx = Math.abs(s.vx) }
        if (s.x > W + 80) { s.x = -60; s.vx = -Math.abs(s.vx) }
      }

      // phase logic
      if (g.phase === 'dropping') {
        g.hookY += 4
        if (g.hookY >= g.targetY) {
          g.phase = 'waiting'; g.waitStart = t; g.target = null
          if (g.special) g.specialAt = t + 90 + Math.random() * 160
        }
      } else if (g.phase === 'waiting') {
        if (zoneRef.current.id === 'reef') {
          g.castX += Math.sin(t / 80) * 0.3
          g.castX = Math.max(110, Math.min(430, g.castX))
        }
        if (g.special) {
          // something that isn't a fish is about to snag the line
          if (t >= g.specialAt) {
            g.biteData = g.special
            g.phase = 'bite'; g.biteFlash = t
            sfx.play('bite')
          }
        } else {
          if (!g.target) {
            // Depth now matters: benthic species ignore a shallow hook.
            const deepEnough = g.hookY > WATER + (H - WATER) * 0.55
            let best = null, bd = 1e9
            for (const s of swimmers) {
              if (needsDeepCast(s.data) && !deepEnough) continue
              const d = Math.hypot(s.x - g.castX, s.baseY - g.hookY)
              if (d < bd) { bd = d; best = s }
            }
            g.target = best
          }
          if (g.target) {
            const s = g.target
            const dx = g.castX - s.x, dy = g.hookY - s.baseY
            const d = Math.hypot(dx, dy) || 1
            const steer = (1.3 + ((upgradesRef.current && upgradesRef.current.bait) || 0) * 0.3 + weatherSteer)
              * (1 + (biteRef.current || 0))
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
        }
      } else if (g.phase === 'bite') {
        if (t - g.biteFlash > 36) {
          const up = upgradesRef.current || { rod: 0, line: 0, bait: 0 }
          const df = DIFF[difficultyRef.current] || DIFF.normal
          g.phase = 'fight'
          g.progress = START_PROGRESS * df.start + up.line * 5
          g.barH = Math.min(TRACK_H - 10, Math.max(46, 116 * df.bar + up.line * 10 - g.biteData.fight * 3))
          g.lift = LIFT + up.rod * 0.07
          g.fill = FILL * df.fill + up.rod * 0.05
          g.drain = DRAIN * df.drain
          g.markerMul = df.marker * (g.biteData.kind === 'treasure' ? 0.6 : 1) // treasure is heavy, not darty
          g.barY = (TRACK_TOP + TRACK_BOT) / 2
          g.barVel = 0
          g.markerY = (TRACK_TOP + TRACK_BOT) / 2
          g.markerTarget = g.markerY
          g.markerNext = t + 40
          // --- tension + stamina ---
          g.tension = 0
          g.snapAt = 100
          // tougher line takes longer to snap; tougher fish loads it faster
          g.tensionUp = (1.9 + g.biteData.fight * 0.19) / (1 + up.line * 0.22)
          g.tensionDown = 1.5 + up.line * 0.15
          g.stam = 1
          g.style = g.biteData.kind ? 'steady' : fightStyleOf(g.biteData)
          g.burst = 0
          if (zoneRef.current.id === 'wreck' && (!g.biteData.kind && g.biteData.id !== 'leviathan') && Math.random() < 0.08) {
            g.snagged = true
            g.snagTimer = 60
          } else {
            g.snagged = false
          }
        }
      } else if (g.phase === 'fight') {
        if (g.snagged) {
          g.snagTimer--
          if (g.reeling) {
            g.snagged = false
            g.reeling = false
            g.shake = 10
            sfx.play('hit')
          } else if (g.snagTimer <= 0) {
            g.snapped = true; sfx.play('escape'); finish(false)
          }
        } else {
          const f = g.biteData.fight
          const half = g.barH / 2
          g.barVel += GRAV
        if (g.reeling) {
          g.barVel -= g.lift
          if (t % 7 === 0) sfx.play('reel')
        }
        g.barY += g.barVel
        if (g.barY < TRACK_TOP + half) { g.barY = TRACK_TOP + half; g.barVel = 0 }
        if (g.barY > TRACK_BOT - half) { g.barY = TRACK_BOT - half; g.barVel *= -0.3 }
        // --- stamina: the fish tires as you win, so late fight calms down ---
        g.stam = Math.max(0.35, 1 - (g.progress / 100) * 0.62)

        // --- species fight style picks WHERE and HOW OFTEN it moves ---
        if (t >= g.markerNext) {
          const lo = TRACK_TOP + 12, span = TRACK_H - 24
          let target, wait
          switch (g.style) {
            case 'runner': // long sprints end to end, then a pause
              g.burst = g.burst > 0 ? 0 : 1
              target = g.burst ? (g.markerY > (TRACK_TOP + TRACK_BOT) / 2 ? lo : lo + span) : lo + Math.random() * span
              wait = g.burst ? 26 : 70 + Math.random() * 40
              break
            case 'sounder': // dives for the bottom, brief rises
              target = Math.random() < 0.72 ? lo + span * (0.72 + Math.random() * 0.28) : lo + Math.random() * span * 0.5
              wait = 45 + Math.random() * 45
              break
            case 'hugger': // clings low, small moves
              target = lo + span * (0.6 + Math.random() * 0.4)
              wait = 55 + Math.random() * 55
              break
            case 'darter': // frequent small twitchy hops
              target = Math.max(lo, Math.min(lo + span, g.markerY - TRACK_TOP + (Math.random() - 0.5) * span * 0.45 + TRACK_TOP))
              wait = 16 + Math.random() * 20
              break
            default:
              target = lo + Math.random() * span
              wait = 60 + Math.random() * 70 - f * 4
          }
          g.markerTarget = Math.max(lo, Math.min(lo + span, target))
          g.markerNext = t + Math.max(14, wait)
        }
        const burstMul = g.style === 'runner' && g.burst ? 2.1 : 1
        const ms = (0.4 + f * 0.1) * MARKER_SPEED * g.markerMul * g.stam * burstMul
        const dm = g.markerTarget - g.markerY
        g.markerY += Math.sign(dm) * Math.min(ms, Math.abs(dm))
        g.markerY = Math.max(TRACK_TOP + 6, Math.min(TRACK_BOT - 6, g.markerY))

        const inZone = Math.abs(g.markerY - g.barY) <= half
        g.progress += inZone ? g.fill : -g.drain
        g.progress = Math.max(0, Math.min(100, g.progress))

        // --- line tension: reeling loads the line, easing lets it recover ---
        // Fighting a fresh fish strains hardest; a tired one gives in.
        g.tension += g.reeling ? g.tensionUp * (0.55 + g.stam * 0.75) : -g.tensionDown
        g.tension = Math.max(0, Math.min(g.snapAt, g.tension))

        g.hookY = WATER + 12 + (1 - g.progress / 100) * (g.targetY + 18 - (WATER + 12))
        if (g.tension >= g.snapAt) { g.snapped = true; sfx.play('escape'); finish(false) } // line snapped
        else if (g.progress <= 0) finish(false)  // meter emptied — it escapes
        else if (g.progress >= 100) finish(true) // landed
        }
      } else if (g.phase === 'retract') {
        g.hookY -= 6
        if (g.hookY <= WATER) { g.phase = 'idle'; g.biteData = null }
      }

      // draw swimmers
      for (const s of swimmers) {
        drawFish(ctx, s.data, s.x, s.baseY + s.yoff, s.scale, s.vx > 0, Math.sin(s.wob * 1.4))
      }

      const b = abyss ? drawSub() : drawBoat()
      const hk = drawLine(b)

      if (g.phase === 'fight' && g.biteData) {
        const wig = Math.sin(t / 3) * 4
        const hookedScale = g.biteData.kind ? 4 : fishScale(g.biteData)
        drawFish(ctx, g.biteData, g.castX + wig, g.hookY + 14, hookedScale, wig > 0, g.biteData.kind ? 0 : Math.sin(t / 4))
        drawGauge()
        hint(g.biteData.kind === 'treasure'
          ? 'Something heavy! HOLD to keep the zone on it'
          : 'HOLD to raise the green zone — keep it over the fish')
      } else if (g.phase === 'bite') {
        drawBite(t - g.biteFlash)
      } else if (g.phase === 'idle') {
        const hHint = zoneRef.current.id === 'ice' && !g.hole ? 'Tap to drill a hole in the ice' : 'Tap the water to cast — deeper taps sink the hook lower'
        hint(abyss ? 'Tap the dark to lower the winch — the lure glows' : hHint)
      } else if (g.phase === 'waiting' || g.phase === 'dropping') {
        if (g.phase === 'waiting' && !abyss) drawBobber(WATER + Math.sin(t / 12) * 2)
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

      // rain-on-lens
      if (weather === 'rain' || weather === 'storm') {
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        for (let i = 0; i < 6; i++) {
          const dx = (i * 277 + Math.sin(t / 200 + i) * 15) % W
          const dy = ((i * 311 + Math.max(0, t * 0.1 - i * 15)) % (H + 40)) - 20
          ctx.fillRect(Math.round(dx / PX) * PX, Math.round(dy / PX) * PX, PX, PX * 2)
        }
      }

      // night vignette (stepped alpha rects for pixel-consistent dark edges)
      const d = daylight()
      if (d < 0.3) {
        const vAlpha = (0.3 - d) / 0.3 * 0.6
        ctx.fillStyle = `rgba(0,4,12,${vAlpha.toFixed(2)})`
        ctx.fillRect(0, 0, W, PX * 3) // top
        ctx.fillRect(0, H - PX * 3, W, PX * 3) // bot
        ctx.fillRect(0, 0, PX * 3, H) // left
        ctx.fillRect(W - PX * 3, 0, PX * 3, H) // right
        ctx.fillStyle = `rgba(0,4,12,${(vAlpha * 0.5).toFixed(2)})`
        ctx.fillRect(PX * 3, PX * 3, W - PX * 6, PX * 3)
        ctx.fillRect(PX * 3, H - PX * 6, W - PX * 6, PX * 3)
        ctx.fillRect(PX * 3, PX * 3, PX * 3, H - PX * 6)
        ctx.fillRect(W - PX * 6, PX * 3, PX * 3, H - PX * 6)
      }

      ctx.restore()

      if (g.phase !== lastPhase) { lastPhase = g.phase; setUiPhase(g.phase) }

      raf = requestAnimationFrame(frame)
    }
    frame()

    // keep population up
    const pop = setInterval(() => {
      if (swimmers.length < (abyss ? 8 : 7)) spawnSwimmer(true)
      // predators thin the shoals, so top the population back up
      if (swimmers.length < 4) spawnSwimmer(true)
    }, 2500)

    sfx.startAmbient()
    return () => {
      sfx.stopAmbient()
      cancelAnimationFrame(raf)
      clearInterval(pop)
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
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
            {zone.view === 'abyss' ? '🪝 DROP' : '🎣 CAST'}
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
