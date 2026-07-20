// Daily quests: 3 per day, deterministic from the date string so a reload
// mid-day always shows the same board. Progress lives in save.quests.
import { ZONES } from './zones.js'

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFrom(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

export function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Quest types. Each returns { type, desc, goal, reward, ...params }.
const MAKERS = [
  (r) => {
    const n = [5, 8, 12][Math.floor(r() * 3)]
    return { type: 'catch', desc: `Catch ${n} fish`, goal: n, reward: n * 14 }
  },
  (r) => {
    // early zones only, so the quest is always doable
    const z = ZONES[Math.floor(r() * 4)]
    const n = 2 + Math.floor(r() * 3)
    return { type: 'zone', zone: z.id, desc: `Catch ${n} fish in the ${z.name}`, goal: n, reward: 40 + n * 25 }
  },
  (r) => {
    const n = 1 + Math.floor(r() * 2)
    return { type: 'rare', desc: `Catch ${n} rare-or-better fish`, goal: n, reward: 70 + n * 60 }
  },
  (r) => {
    const n = [50, 80, 120][Math.floor(r() * 3)]
    return { type: 'size', desc: `Land a fish ${n} cm or bigger`, goal: 1, size: n, reward: 50 + n }
  },
  () => ({ type: 'treasure', desc: 'Reel in a treasure', goal: 1, reward: 130 }),
  (r) => {
    const n = 3 + Math.floor(r() * 3)
    return { type: 'streak', desc: `Get a catch streak of ${n}`, goal: 1, streak: n, reward: 40 + n * 25 }
  },
]

export function dailyQuests(dateKey) {
  const r = mulberry32(seedFrom(dateKey))
  const idxs = []
  while (idxs.length < 3) {
    const i = Math.floor(r() * MAKERS.length)
    if (!idxs.includes(i)) idxs.push(i)
  }
  return idxs.map((i, qi) => ({ id: qi, ...MAKERS[i](r) }))
}
