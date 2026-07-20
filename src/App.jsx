import { useEffect, useState, useRef } from 'react'
import { ZONES, RARITY, setColorblind } from './data/zones.js'
import { FISH, fishByZone } from './data/fish.js'
import { SHOP, MAX_LEVEL, nextCost } from './data/shop.js'
import { ACHIEVEMENTS } from './data/achievements.js'
import { blurb } from './data/blurbs.js'
import { dailyQuests, todayKey } from './data/quests.js'
import { rollTreasureValue } from './data/items.js'
import { RELICS, RELIC_RARITY, RELIC_TIERS, relicPerks, perkLabel, SET_BONUSES, completedSets } from './data/relics.js'
import { CRATES, openCrate, crateOdds } from './data/crates.js'
import { COSMETIC_GROUPS, DEFAULT_EQUIPPED, buildSkin } from './data/cosmetics.js'
import { SLOTS, CAP_HOURS, fishRate, totalRate, pendingIncome, fmtRate } from './data/aquarium.js'
import { BAITS, baitById, baitBonus, SCRAP_PER_TRASH } from './data/bait.js'
import { prestigeStatus, applyPrestige, voyageMultiplier, VOYAGE_BONUS } from './data/prestige.js'
import { catchValue } from './game.js'
import { CONTEST_DURATION, CONTESTS } from './data/contest.js'
import Scene from './scene/Scene.jsx'
import PixelFish from './pixel/PixelFish.jsx'
import * as sfx from './audio/sfx.js'
import { exportCatchCard } from './util/png.js'

const SAVE_KEY = 'pixel-fishing-save-v7'
const OLD_KEYS = ['pixel-fishing-save-v6', 'pixel-fishing-save-v5', 'pixel-fishing-save-v4']
const DEFAULT = {
  coins: 0, unlocked: ['fresh'], dex: {},
  upgrades: { rod: 0, line: 0, bait: 0 },
  stats: { maxStreak: 0, shinies: 0, coinsEarned: 0, trash: 0, treasure: 0, questsDone: 0, contestBest: 0 },
  achievements: [],
  quests: { date: '', progress: {}, claimed: [] },
  relics: {},                                   // id -> { count }
  crateStats: { opened: 0, dust: 0, spent: 0 },
  cosmetics: { owned: ['oak', 'classic', 'amber'], equipped: { ...DEFAULT_EQUIPPED } },
  aquarium: { slots: [null, null, null, null, null, null], lastCollect: 0, earned: 0 },
  bait: { scrap: 0, active: null },             // active: { id, charges }
  prestige: { voyages: 0 },
  login: { lastDay: '', streak: 0 },            // daily streak, local-date keyed
  tutorialSeen: false,
  difficulty: 'normal',
  volume: 0.8,
  musicVolume: 0.5,
  colorblind: false,
}
const SHINY_CHANCE = 0.025
const GOLD = { body: '#f4cf4a', fin: '#fff2a8', tail: '#ffdf5c', dark: '#8a6a10' }
const TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary']

function loadSave() {
  try {
    let raw = localStorage.getItem(SAVE_KEY)
    for (const k of OLD_KEYS) { if (!raw) raw = localStorage.getItem(k) }
    if (raw) {
      const p = JSON.parse(raw)
      // deep-merge every nested object so older saves don't crash on new keys
      return {
        ...DEFAULT, ...p,
        upgrades: { ...DEFAULT.upgrades, ...(p.upgrades || {}) },
        stats: { ...DEFAULT.stats, ...(p.stats || {}) },
        quests: { ...DEFAULT.quests, ...(p.quests || {}) },
        relics: { ...DEFAULT.relics, ...(p.relics || {}) },
        crateStats: { ...DEFAULT.crateStats, ...(p.crateStats || {}) },
        cosmetics: {
          owned: p.cosmetics?.owned || DEFAULT.cosmetics.owned,
          equipped: { ...DEFAULT.cosmetics.equipped, ...(p.cosmetics?.equipped || {}) },
        },
        aquarium: {
          ...DEFAULT.aquarium, ...(p.aquarium || {}),
          // guarantee exactly SLOTS entries even if the constant changes
          slots: Array.from({ length: SLOTS }, (_, i) => (p.aquarium?.slots || [])[i] ?? null),
        },
        bait: { ...DEFAULT.bait, ...(p.bait || {}) },
        prestige: { ...DEFAULT.prestige, ...(p.prestige || {}) },
        login: { ...DEFAULT.login, ...(p.login || {}) },
        achievements: p.achievements || [],
      }
    }
  } catch {}
  return DEFAULT
}

function displayFish(fish, shiny) {
  return shiny ? { ...fish, palette: GOLD } : fish
}

// Burn one charge off the active bait; clear it when exhausted.
function spendCharge(active) {
  if (!active || !active.id) return null
  const left = active.charges - 1
  return left > 0 ? { ...active, charges: left } : null
}

export default function App() {
  const [save, setSave] = useState(loadSave)
  const [zone, setZone] = useState('fresh')
  const [popup, setPopup] = useState(null)
  const [panel, setPanel] = useState(null)
  const [muted, setMuted] = useState(false)
  const [streak, setStreak] = useState(0)
  const [achToast, setAchToast] = useState(null)
  const [floats, setFloats] = useState([])
  const [combo, setCombo] = useState(null)
  const floatId = useRef(0)
  const [detail, setDetail] = useState(null)
  const [reveal, setReveal] = useState(null)   // crate result card
  const [contest, setContest] = useState({ active: false, endsAt: 0, score: 0 })
  const [daily, setDaily] = useState(null)     // login streak card
  const [ioMsg, setIoMsg] = useState('')
  const [relicDetail, setRelicDetail] = useState(null)

  const [dexFilter, setDexFilter] = useState('all')   // all | caught | missing | <rarity>
  const [dexSort, setDexSort] = useState('zone')      // zone | rarity | size | value | name
  const [tick, setTick] = useState(0)                 // drives live aquarium counter

  // Passive bonuses: relics + completed sets, plus active bait and voyages.
  const ownedRelicIds = Object.keys(save.relics || {})
  const perks = relicPerks(ownedRelicIds)
  const sets = completedSets(ownedRelicIds)
  const bBonus = baitBonus(save.bait?.active)
  const voyageMult = voyageMultiplier(save.prestige?.voyages || 0)
  const liveLuck = perks.luck + bBonus.luck
  const liveBite = perks.bite + bBonus.bite
  const skin = buildSkin(save.cosmetics?.equipped)
  const aqRate = totalRate(save.aquarium?.slots || [])
  const aqPending = pendingIncome(save.aquarium || {}, Date.now())

  // Contest loop
  useEffect(() => {
    if (!contest.active) return
    const id = setInterval(() => {
      setContest(c => {
        if (Date.now() >= c.endsAt) {
          setReveal({ type: 'contest', score: c.score })
          setSave(s => ({ ...s, stats: { ...s.stats, contestBest: Math.max(s.stats.contestBest || 0, c.score) } }))
          return { ...c, active: false }
        }
        return { ...c, _tick: Date.now() }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [contest.active])

  // refresh the aquarium readout once a second while its panel is open
  useEffect(() => {
    if (panel !== 'aquarium') return
    const h = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(h)
  }, [panel])
  void tick

  const qKey = todayKey()
  const quests = dailyQuests(qKey)

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)) } catch {}
  }, [save])
  useEffect(() => { sfx.setMuted(muted) }, [muted])
  useEffect(() => { sfx.updateVolume ? sfx.updateVolume(save.volume) : sfx.setVolume(save.volume) }, [save.volume])
  useEffect(() => { if (sfx.setMusicVolume) sfx.setMusicVolume(save.musicVolume ?? 0.5) }, [save.musicVolume])
  useEffect(() => { setColorblind(save.colorblind) }, [save.colorblind])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        if (detail) setDetail(null)
        else if (popup && (popup.item || popup.fish || popup.treasure)) setPopup(null)
        else if (panel) setPanel(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detail, popup, panel])

  // reset the quest board when the day rolls over
  useEffect(() => {
    if (save.quests.date !== qKey) {
      setSave((s) => ({ ...s, quests: { date: qKey, progress: {}, claimed: [] } }))
    }
  }, [qKey, save.quests.date])

  // Evaluate achievements whenever progress changes.
  useEffect(() => {
    const dexIds = Object.keys(save.dex)
    const x = {
      total: Object.values(save.dex).reduce((s, e) => s + e.count, 0),
      species: dexIds.length,
      totalSpecies: FISH.length,
      totalZones: ZONES.length,
      biggest: Object.values(save.dex).reduce((m, e) => Math.max(m, e.record), 0),
      zonesFished: new Set(dexIds.map((id) => FISH.find((f) => f.id === id)?.habitat)).size,
      legendary: dexIds.some((id) => FISH.find((f) => f.id === id)?.rarity === 'legendary'),
      deepSpecies: dexIds.filter((id) => {
        const h = FISH.find((f) => f.id === id)?.habitat
        return h === 'deepsea' || h === 'wreck'
      }).length,
      maxStreak: save.stats.maxStreak,
      shinies: save.stats.shinies,
      coinsEarned: save.stats.coinsEarned || 0,
      trash: save.stats.trash || 0,
      treasure: save.stats.treasure || 0,
      quests: save.stats.questsDone || 0,
      relics: Object.keys(save.relics || {}).length,
      totalRelics: RELICS.length,
      mythic: Object.keys(save.relics || {}).some((id) => RELICS.find((r) => r.id === id)?.rarity === 'mythic'),
      crates: save.crateStats?.opened || 0,
    }
    const newly = ACHIEVEMENTS.filter((a) => !save.achievements.includes(a.id) && a.test(x))
    if (newly.length) {
      setSave((s) => ({ ...s, achievements: [...s.achievements, ...newly.map((a) => a.id)] }))
      setAchToast(newly[0])
      sfx.play('buy')
      setTimeout(() => setAchToast(null), 3200)
    }
  }, [save])

  const zoneData = ZONES.find((z) => z.id === zone)
  const unlocked = save.unlocked.includes(zone)

  // Advance quest progress. ev: { fish, size, zone, treasure, streak }
  function questProgress(prog, ev) {
    const next = { ...prog }
    for (const q of quests) {
      const cur = next[q.id] || 0
      if (cur >= q.goal) continue
      let inc = 0
      if (q.type === 'catch' && ev.fish) inc = 1
      else if (q.type === 'zone' && ev.fish && ev.zone === q.zone) inc = 1
      else if (q.type === 'rare' && ev.fish && TIERS.indexOf(ev.fish.rarity) >= TIERS.indexOf('rare')) inc = 1
      else if (q.type === 'size' && ev.fish && ev.size >= q.size) inc = 1
      else if (q.type === 'treasure' && ev.treasure) inc = 1
      else if (q.type === 'streak' && ev.streak >= q.streak) inc = 1
      if (inc) next[q.id] = Math.min(q.goal, cur + inc)
    }
    return next
  }

  function pushFloat(amount) {
    const fid = ++floatId.current
    setFloats((f) => [...f, { id: fid, amount }])
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== fid)), 1200)
  }

  function handleResult(fish, size, landed) {
    // ---- non-fish catches ----
    if (fish.kind === 'trash' || fish.kind === 'treasure') {
      if (!landed) {
        setPopup({ fish, size: 0, value: 0, landed: false, item: true })
        setTimeout(() => setPopup(null), 2600)
        return
      }
      const isTreasure = fish.kind === 'treasure'
      const value = Math.round((isTreasure ? rollTreasureValue(fish) : fish.value) * (1 + perks.coin) * voyageMult)
      const scrapGain = isTreasure ? 0 : SCRAP_PER_TRASH
      pushFloat(value)
      setContest(c => c.active ? { ...c, score: c.score + value } : c)
      setPopup({ fish, size: 0, value, landed: true, item: true, treasure: isTreasure, scrap: scrapGain })
      setSave((s) => ({
        ...s,
        coins: s.coins + value,
        // junk is no longer a dead catch: it feeds bait crafting
        bait: { ...s.bait, scrap: (s.bait?.scrap || 0) + scrapGain, active: spendCharge(s.bait?.active) },
        stats: {
          ...s.stats,
          trash: (s.stats.trash || 0) + (isTreasure ? 0 : 1),
          treasure: (s.stats.treasure || 0) + (isTreasure ? 1 : 0),
          coinsEarned: (s.stats.coinsEarned || 0) + value,
        },
        quests: { ...s.quests, progress: questProgress(s.quests.progress, { treasure: isTreasure, streak }) },
      }))
      setTimeout(() => setPopup(null), 2600)
      return
    }

    // ---- fish ----
    const prev = save.dex[fish.id]
    const isNew = landed && !prev
    const isRecord = landed && (!prev || size > prev.record)
    if (landed) {
      // relic perks stack on top of the base rates
      const shiny = Math.random() < SHINY_CHANCE + perks.shiny
      const newStreak = streak + 1
      const mult = 1 + Math.min(newStreak - 1, 9) * 0.1 // +10% per catch in a row, cap +90%
      const value = Math.round(catchValue(fish, size) * mult * (shiny ? 5 : 1) * (1 + perks.coin) * voyageMult)
      setStreak(newStreak)
      if (newStreak >= 3) {
        setCombo({ n: newStreak, key: Date.now() })
        setTimeout(() => setCombo(null), 1400)
      }
      setPopup({ fish, size, value, landed, isNew, isRecord, mult, shiny })
      pushFloat(value)
      setContest(c => c.active ? { ...c, score: c.score + value } : c)
      setSave((s) => {
        const p = s.dex[fish.id] || { count: 0, record: 0, shiny: false }
        return {
          ...s,
          coins: s.coins + value,
          dex: { ...s.dex, [fish.id]: { count: p.count + 1, record: Math.max(p.record, size), shiny: p.shiny || shiny } },
          bait: { ...s.bait, active: spendCharge(s.bait?.active) },
          stats: {
            ...s.stats,
            maxStreak: Math.max(s.stats.maxStreak, newStreak),
            shinies: s.stats.shinies + (shiny ? 1 : 0),
            coinsEarned: (s.stats.coinsEarned || 0) + value,
          },
          quests: { ...s.quests, progress: questProgress(s.quests.progress, { fish, size, zone, streak: newStreak }) },
        }
      })
    } else {
      setStreak(0)
      setPopup({ fish, size, value: 0, landed, isNew, isRecord, mult: 1, shiny: false })
    }
    setTimeout(() => setPopup(null), 2600)
  }

  function claimQuest(q) {
    const done = (save.quests.progress[q.id] || 0) >= q.goal
    const claimed = save.quests.claimed.includes(q.id)
    if (!done || claimed) return
    sfx.play('quest')
    pushFloat(q.reward)
    setSave((s) => ({
      ...s,
      coins: s.coins + q.reward,
      stats: { ...s.stats, questsDone: (s.stats.questsDone || 0) + 1, coinsEarned: (s.stats.coinsEarned || 0) + q.reward },
      quests: { ...s.quests, claimed: [...s.quests.claimed, q.id] },
    }))
  }

  function buyCrate(crate) {
    if (save.coins < crate.cost) return
    const result = openCrate(crate, ownedRelicIds, perks.crate)
    sfx.play(result.duplicate ? 'buy' : 'treasure')
    setReveal({ ...result, crate, key: Date.now() })
    if (result.dust) pushFloat(result.dust)
    setSave((s) => {
      const prev = s.relics[result.relic.id]
      return {
        ...s,
        coins: s.coins - crate.cost + result.dust,
        relics: { ...s.relics, [result.relic.id]: { count: (prev ? prev.count : 0) + 1 } },
        crateStats: {
          opened: (s.crateStats.opened || 0) + 1,
          dust: (s.crateStats.dust || 0) + result.dust,
          spent: (s.crateStats.spent || 0) + crate.cost,
        },
        stats: { ...s.stats, coinsEarned: (s.stats.coinsEarned || 0) + result.dust },
      }
    })
  }

  // Daily login streak. Runs once per mount; consecutive local days extend the
  // streak, a gap resets it. Reward scales and caps at day 7.
  useEffect(() => {
    const today = todayKey()
    if (save.login.lastDay === today) return
    const y = new Date(); y.setDate(y.getDate() - 1)
    const yKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
    const streak = save.login.lastDay === yKey ? Math.min(7, save.login.streak + 1) : 1
    const reward = 120 * streak + (streak >= 7 ? 500 : 0)
    setSave((s) => ({
      ...s,
      coins: s.coins + reward,
      login: { lastDay: today, streak },
      stats: { ...s.stats, coinsEarned: (s.stats.coinsEarned || 0) + reward },
    }))
    setDaily({ streak, reward, key: Date.now() })
    sfx.play('quest')
  }, [])

  function exportSave() {
    try {
      const blob = btoa(unescape(encodeURIComponent(JSON.stringify(save))))
      navigator.clipboard?.writeText(blob)
      setIoMsg(`Copied ${blob.length} chars to clipboard.`)
    } catch { setIoMsg('Export failed.') }
  }

  function importSave(text) {
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(text.trim()))))
      if (!parsed || typeof parsed !== 'object' || typeof parsed.coins !== 'number') {
        setIoMsg('Not a valid save.'); return
      }
      if (!window.confirm('Overwrite current progress with this save?')) return
      // route through the same merge loadSave uses, so old/partial blobs migrate
      localStorage.setItem(SAVE_KEY, JSON.stringify(parsed))
      setSave(loadSave())
      setIoMsg('Save imported.')
    } catch { setIoMsg('Could not read that code.') }
  }

  function buyCosmetic(groupKey, item) {
    if (save.cosmetics.owned.includes(item.id) || save.coins < item.cost) return
    sfx.play('buy')
    setSave((s) => ({
      ...s,
      coins: s.coins - item.cost,
      cosmetics: {
        owned: [...s.cosmetics.owned, item.id],
        equipped: { ...s.cosmetics.equipped, [groupKey]: item.id },
      },
    }))
  }

  function equipCosmetic(groupKey, item) {
    if (!save.cosmetics.owned.includes(item.id)) return
    sfx.play('reel')
    setSave((s) => ({
      ...s,
      cosmetics: { ...s.cosmetics, equipped: { ...s.cosmetics.equipped, [groupKey]: item.id } },
    }))
  }

  function craftBait(b) {
    if ((save.bait?.scrap || 0) < b.scrap) return
    sfx.play('buy')
    setSave((s) => ({
      ...s,
      bait: { scrap: s.bait.scrap - b.scrap, active: { id: b.id, charges: b.charges } },
    }))
  }

  function collectAquarium() {
    const got = pendingIncome(save.aquarium, Date.now())
    if (got.coins <= 0) return
    sfx.play('treasure')
    pushFloat(got.coins)
    setSave((s) => ({
      ...s,
      coins: s.coins + got.coins,
      aquarium: { ...s.aquarium, lastCollect: Date.now(), earned: (s.aquarium.earned || 0) + got.coins },
      stats: { ...s.stats, coinsEarned: (s.stats.coinsEarned || 0) + got.coins },
    }))
  }

  // Placing/removing a fish banks the accrued coins first, so changing the
  // line-up never silently pays out at the wrong rate.
  function setSlot(index, fishId) {
    const got = pendingIncome(save.aquarium, Date.now())
    sfx.play('reel')
    setSave((s) => {
      const slots = [...s.aquarium.slots]
      // a species can only occupy one tank
      const dupe = slots.indexOf(fishId)
      if (fishId && dupe >= 0) slots[dupe] = null
      slots[index] = fishId
      return {
        ...s,
        coins: s.coins + got.coins,
        aquarium: { slots, lastCollect: Date.now(), earned: (s.aquarium.earned || 0) + got.coins },
        stats: { ...s.stats, coinsEarned: (s.stats.coinsEarned || 0) + got.coins },
      }
    })
  }

  function doPrestige() {
    const st = prestigeStatus(save)
    if (!st.ready) return
    if (!window.confirm(
      `Set sail on a new voyage?\n\nRESET: coins, zone unlocks, tackle upgrades.\nKEPT: Fishdex, relics, achievements, aquarium, cosmetics.\n\nPermanent coin bonus becomes ×${st.nextMult.toFixed(2)}.`
    )) return
    sfx.play('treasure')
    setSave((s) => applyPrestige(s))
    setZone('fresh')
    setStreak(0)
    setPanel(null)
  }

  function unlockZone(z) {
    if (save.coins < z.unlockCost) return
    sfx.play('buy')
    setSave((s) => ({ ...s, coins: s.coins - z.unlockCost, unlocked: [...s.unlocked, z.id] }))
  }

  function buyUpgrade(item) {
    const level = save.upgrades[item.key]
    const cost = nextCost(item, level)
    if (cost == null || save.coins < cost) return
    sfx.play('buy')
    setSave((s) => ({
      ...s,
      coins: s.coins - cost,
      upgrades: { ...s.upgrades, [item.key]: s.upgrades[item.key] + 1 },
    }))
  }

  // Fishdex filter + sort. Returns a new array; never mutates FISH.
  const RTIER = ['common', 'uncommon', 'rare', 'epic', 'legendary']
  function applyDexView(list) {
    let out = list
    if (dexFilter === 'caught') out = out.filter((f) => save.dex[f.id])
    else if (dexFilter === 'missing') out = out.filter((f) => !save.dex[f.id])
    else if (RARITY[dexFilter]) out = out.filter((f) => f.rarity === dexFilter)
    const by = {
      rarity: (a, b) => RTIER.indexOf(b.rarity) - RTIER.indexOf(a.rarity) || a.name.localeCompare(b.name),
      size: (a, b) => b.maxSize - a.maxSize,
      value: (a, b) => b.baseValue * RARITY[b.rarity].mult - a.baseValue * RARITY[a.rarity].mult,
      name: (a, b) => a.name.localeCompare(b.name),
    }[dexSort]
    return by ? [...out].sort(by) : out
  }

  const caughtCount = Object.keys(save.dex).length
  const totalCaught = Object.values(save.dex).reduce((s, e) => s + e.count, 0)
  const biggestEntry = Object.entries(save.dex).reduce(
    (best, [id, e]) => (e.record > (best ? best.rec : 0) ? { id, rec: e.record } : best), null)
  const biggestFish = biggestEntry ? FISH.find((f) => f.id === biggestEntry.id) : null
  const zoneCounts = {}
  Object.entries(save.dex).forEach(([id, e]) => {
    const h = FISH.find((f) => f.id === id)?.habitat
    if (h) zoneCounts[h] = (zoneCounts[h] || 0) + e.count
  })
  const favZone = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0]
  const claimableQuests = quests.filter(
    (q) => (save.quests.progress[q.id] || 0) >= q.goal && !save.quests.claimed.includes(q.id)).length

  return (
    <div className="app">
      <header className="topbar">
        <h1>🎣 Fish, huh</h1>
        <div className="top-right">
          <div className="coin-floats">
            {floats.map((f) => <span key={f.id} className="coin-float">+{f.amount} 🪙</span>)}
          </div>
          <button className="btn small" onClick={() => {
            if (contest.active) return
            setContest({ active: true, endsAt: Date.now() + CONTEST_DURATION, score: 0 })
          }} disabled={contest.active}>🏆 {contest.active ? 'Running' : 'Sprint'}</button>
          {streak > 1 && <div className="chip streak">🔥 {streak}</div>}
          {save.prestige?.voyages > 0 && (
            <div className="chip voyage" title={`${save.prestige.voyages} voyage(s) — ×${voyageMult.toFixed(2)} coins`}>
              ⚓ ×{voyageMult.toFixed(2)}
            </div>
          )}
          <div className="chip coins">🪙 {save.coins}</div>
          <button className="chip icon" title="Daily Quests" onClick={() => setPanel(panel === 'quests' ? null : 'quests')}>
            📜{claimableQuests > 0 && <span className="notif">{claimableQuests}</span>}
          </button>
          <button className="chip icon" title="Crates" onClick={() => setPanel(panel === 'crates' ? null : 'crates')}>
            🎁{save.coins >= CRATES[0].cost && <span className="notif dot-only" />}
          </button>
          <button className="chip icon" title="Hall of Fame" onClick={() => setPanel(panel === 'hall' ? null : 'hall')}>🏛️</button>
          <button className="chip icon" title="Aquarium" onClick={() => setPanel(panel === 'aquarium' ? null : 'aquarium')}>
            🐠{aqPending.coins > 0 && <span className="notif dot-only" />}
          </button>
          <button className="chip icon" title="Bait Bench" onClick={() => setPanel(panel === 'bait' ? null : 'bait')}>
            🪱{(save.bait?.scrap || 0) >= BAITS[0].scrap && !save.bait?.active && <span className="notif dot-only" />}
          </button>
          <button className="chip icon" title="Shipyard" onClick={() => setPanel(panel === 'cosmetics' ? null : 'cosmetics')}>🚢</button>
          <button className="chip icon" title="Voyage" onClick={() => setPanel(panel === 'prestige' ? null : 'prestige')}>
            ⛵{prestigeStatus(save).ready && <span className="notif dot-only" />}
          </button>
          <button className="chip icon" title="Tackle Shop" onClick={() => setPanel(panel === 'shop' ? null : 'shop')}>🛒</button>
          <button className="chip icon" title="Fishdex" onClick={() => setPanel(panel === 'dex' ? null : 'dex')}>📖</button>
          <button className="chip icon" title="Achievements" onClick={() => setPanel(panel === 'ach' ? null : 'ach')}>🏆</button>
          <button className="chip icon" title="Trophy Wall" onClick={() => setPanel(panel === 'trophy' ? null : 'trophy')}>🥇</button>
          <button className="chip icon" title="Stats" onClick={() => setPanel(panel === 'stats' ? null : 'stats')}>📊</button>
          <button className="chip icon" title="Settings" onClick={() => setPanel(panel === 'settings' ? null : 'settings')}>⚙️</button>
          <button className="chip icon" title="Sound" onClick={() => setMuted((m) => !m)}>{muted ? '🔇' : '🔊'}</button>
        </div>
      </header>

      {contest.active && (
        <div className="contest-bar" style={{ textAlign: 'center', background: '#12233a', padding: '6px', borderRadius: '8px', border: '2px solid #24384f', margin: '0 10px', display: 'flex', justifyContent: 'space-between' }}>
          <span>⏱️ {Math.max(0, Math.ceil((contest.endsAt - Date.now()) / 1000))}s</span>
          <span style={{ color: '#ffd23c', fontWeight: 'bold' }}>🪙 {contest.score}</span>
        </div>
      )}

      {(perks.coin > 0 || liveLuck > 0 || liveBite > 0 || perks.shiny > 0 || save.bait?.active) && (
        <div className="perk-strip">
          {perks.coin > 0 && <span className="perk-chip mini">🪙 +{Math.round(perks.coin * 100)}%</span>}
          {liveLuck > 0 && <span className="perk-chip mini">🍀 +{liveLuck.toFixed(1)}</span>}
          {liveBite > 0 && <span className="perk-chip mini">🎣 +{Math.round(liveBite * 100)}%</span>}
          {perks.shiny > 0 && <span className="perk-chip mini">✨ +{(perks.shiny * 100).toFixed(1)}%</span>}
          {save.bait?.active && (
            <span className="perk-chip mini bait-live">
              {baitById(save.bait.active.id)?.icon} {baitById(save.bait.active.id)?.name} · {save.bait.active.charges} left
            </span>
          )}
        </div>
      )}

      <nav className="zones">
        {ZONES.map((z) => {
          const isUnlocked = save.unlocked.includes(z.id)
          const zc = fishByZone(z.id).filter((f) => save.dex[f.id]).length
          const zt = fishByZone(z.id).length
          return (
            <button
              key={z.id}
              className={'zone-tab' + (zone === z.id ? ' active' : '') + (isUnlocked ? '' : ' locked')}
              onClick={() => setZone(z.id)}
            >
              <span className="zt-name">{z.icon} {z.short}</span>
              {isUnlocked ? (
                <span className="zt-prog" title={`${zc}/${zt} species`}>
                  <span className="zt-fill" style={{ width: `${zt ? (zc / zt) * 100 : 0}%` }} />
                  <span className="zt-count">{zc}/{zt}</span>
                </span>
              ) : (
                <span className="zt-sub lock">🔒 {z.unlockCost}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="scene-holder">
        {!save.tutorialSeen && (
          <div className="overlay" onClick={() => setSave((s) => ({ ...s, tutorialSeen: true }))}>
            <div className="sheet tut" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head"><h2>🎣 How to Fish</h2></div>
              <ol className="tut-steps">
                <li><b>Cast</b> — tap the water (deeper taps sink the hook lower) or press the <b>CAST</b> button.</li>
                <li><b>Wait</b> — watch the bobber float. When it dips under and a red <b>!</b> pops up, a fish is on the line.</li>
                <li><b>Reel</b> — hold <b>REEL</b> to raise the green zone and keep it over the darting fish until the catch meter fills.</li>
                <li><b>Explore</b> — unlock new waters, complete daily quests 📜, and watch out for junk… and treasure!</li>
              </ol>
              <button className="btn" onClick={() => setSave((s) => ({ ...s, tutorialSeen: true }))}>Got it!</button>
            </div>
          </div>
        )}
        {unlocked ? (
          <Scene
            zone={zoneData}
            onResult={handleResult}
            upgrades={save.upgrades}
            difficulty={save.difficulty}
            luck={liveLuck}
            biteBonus={liveBite}
            skin={skin}
            baitTarget={bBonus.target}
          />
        ) : reveal?.type === 'contest' ? (
          <div className="locked-panel">
            <h2>🏆 Contest Finished!</h2>
            <div style={{ fontSize: '24px', margin: '20px 0', color: '#ffd23c' }}>Score: 🪙 {reveal.score}</div>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '20px' }}>
              Previous Best: 🪙 {save.stats.contestBest || 0}
              {reveal.score > (save.stats.contestBest || 0) && <div style={{ color: '#5fd06a', marginTop: '4px' }}>New Record!</div>}
            </div>
            <button className="btn" onClick={() => setReveal(null)}>Awesome</button>
          </div>
        ) : (
          <div className="locked-panel" style={{ background: `linear-gradient(#0c2740, ${zoneData.bg})` }}>
            <p>{zoneData.icon} {zoneData.name} is locked.</p>
            <button className="btn" disabled={save.coins < zoneData.unlockCost} onClick={() => unlockZone(zoneData)}>
              Unlock for 🪙 {zoneData.unlockCost}
            </button>
            <p className="sub">Earn coins by catching fish in your unlocked zones.</p>
          </div>
        )}

        {combo && (
          <div key={combo.key} className="combo-fx">COMBO ×{combo.n}</div>
        )}

        {popup && (
          <div className={'popup ' + (popup.landed ? 'good' : 'bad') + (popup.treasure ? ' gold' : '')}
            style={popup.landed && !popup.item ? { boxShadow: `0 0 26px ${RARITY[popup.fish.rarity].color}55` } : undefined}>
            {popup.landed ? (
              <>
                {popup.item && popup.treasure && <div className="badge shiny">💰 TREASURE 💰</div>}
                {popup.item && !popup.treasure && <div className="badge trash">JUNK…</div>}
                {!popup.item && popup.shiny && <div className="badge shiny">✨ SHINY ✨</div>}
                {!popup.item && !popup.shiny && popup.isNew && <div className="badge new">NEW!</div>}
                {!popup.item && !popup.shiny && !popup.isNew && popup.isRecord && <div className="badge rec">RECORD!</div>}
                <PixelFish fish={displayFish(popup.fish, popup.shiny)} scale={6} />
                <div className="popup-name" style={{ color: popup.treasure ? '#ffd23c' : popup.item ? '#9aa6b0' : popup.shiny ? '#ffd23c' : RARITY[popup.fish.rarity].color }}>
                  {popup.shiny ? 'Shiny ' : ''}{popup.fish.name}
                </div>
                <div className="popup-meta">
                  {popup.item ? <>🪙 {popup.value}</> : <>{popup.fish.rarity} · {popup.size} cm · 🪙 {popup.value}</>}
                </div>
                {!popup.item && popup.mult > 1 && <div className="popup-mult">🔥 streak ×{popup.mult.toFixed(1)}</div>}
              </>
            ) : (
              <div className="popup-away">The {popup.fish.name} got away!</div>
            )}
          </div>
        )}

        {daily && (
          <div className="overlay reveal-overlay" onClick={() => setDaily(null)}>
            <div key={daily.key} className="reveal-card r-legendary"
              style={{ borderColor: '#ffd23c', boxShadow: '0 0 40px #ffd23c66' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="reveal-rarity" style={{ color: '#ffd23c' }}>Day {daily.streak} streak</div>
              <div className="streak-dots">
                {Array.from({ length: 7 }).map((_, i) => (
                  <span key={i} className={'sdot' + (i < daily.streak ? ' on' : '')} />
                ))}
              </div>
              <div className="reveal-name">Welcome back</div>
              <div className="reveal-new">+🪙 {daily.reward}</div>
              {daily.streak < 7 && <div className="reveal-dup">Return tomorrow for more</div>}
              <button className="btn small" onClick={() => setDaily(null)}>Cast off</button>
            </div>
          </div>
        )}

        {panel === 'trophy' && (() => {
          const tops = Object.entries(save.dex)
            .map(([id, e]) => ({ f: FISH.find((x) => x.id === id), e }))
            .filter((x) => x.f)
            .sort((a, b) => b.e.record - a.e.record)
            .slice(0, 12)
          return (
            <div className="overlay" onClick={() => setPanel(null)}>
              <div className="sheet" onClick={(e) => e.stopPropagation()}>
                <div className="sheet-head">
                  <h2>🥇 Trophy Wall</h2>
                  <span className="coins-sm">{tops.length ? `best ${tops[0].e.record} cm` : '—'}</span>
                  <button className="x" onClick={() => setPanel(null)}>✕</button>
                </div>
                {tops.length === 0 && <p className="quest-note">No catches yet. Go land something.</p>}
                {tops.map((x, i) => (
                  <div key={x.f.id} className={'trophy-row' + (i < 3 ? ' podium p' + (i + 1) : '')}
                    style={{ borderColor: RARITY[x.f.rarity].color }}>
                    <div className="trophy-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div>
                    <div className="trophy-sprite"><PixelFish fish={x.f} scale={3} /></div>
                    <div className="trophy-info">
                      <div className="trophy-name" style={{ color: RARITY[x.f.rarity].color }}>{x.f.name}</div>
                      <div className="trophy-sub">
                        {ZONES.find((z) => z.id === x.f.habitat)?.short} · caught ×{x.e.count}
                        {x.e.shiny && ' · ✨'}
                      </div>
                    </div>
                    <div className="trophy-size">{x.e.record}<span>cm</span></div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {panel === 'aquarium' && (
          <div className="overlay" onClick={() => setPanel(null)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2>🐠 Aquarium</h2>
                <span className="coins-sm">{fmtRate(aqRate)}</span>
                <button className="x" onClick={() => setPanel(null)}>✕</button>
              </div>
              <div className="aq-bank">
                <div className="aq-bank-info">
                  <span className="aq-pending">🪙 {aqPending.coins}</span>
                  <span className="aq-sub">
                    {aqRate <= 0
                      ? 'Add fish to start earning.'
                      : aqPending.capped
                        ? `Tank is full — collect to resume (${CAP_HOURS}h cap).`
                        : `Accruing ${fmtRate(aqRate)} · caps after ${CAP_HOURS}h`}
                  </span>
                </div>
                <button className="btn small" disabled={aqPending.coins <= 0} onClick={collectAquarium}>Collect</button>
              </div>
              <div className="aq-grid">
                {(save.aquarium.slots || []).map((id, i) => {
                  const f = id ? FISH.find((x) => x.id === id) : null
                  return (
                    <div key={i} className={'aq-slot' + (f ? ' filled' : '')}
                      style={f ? { borderColor: RARITY[f.rarity].color } : undefined}>
                      {f ? (
                        <>
                          <div className="aq-sprite"><PixelFish fish={f} scale={3} /></div>
                          <div className="aq-name">{f.name}</div>
                          <div className="aq-rate">{fmtRate(fishRate(f.id))}</div>
                          <button className="aq-clear" onClick={() => setSlot(i, null)}>remove</button>
                        </>
                      ) : (
                        <>
                          <div className="aq-empty">+</div>
                          <select
                            className="aq-select"
                            value=""
                            onChange={(e) => e.target.value && setSlot(i, e.target.value)}
                          >
                            <option value="">choose fish…</option>
                            {Object.keys(save.dex)
                              .map((fid) => FISH.find((x) => x.id === fid))
                              .filter(Boolean)
                              .sort((a, b) => fishRate(b.id) - fishRate(a.id))
                              .map((f2) => (
                                <option key={f2.id} value={f2.id}>{f2.name} · {fmtRate(fishRate(f2.id))}</option>
                              ))}
                          </select>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="quest-note">Rarer, more valuable species earn faster. Total banked: 🪙 {save.aquarium.earned || 0}</p>
            </div>
          </div>
        )}

        {panel === 'bait' && (
          <div className="overlay" onClick={() => setPanel(null)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2>🪱 Bait Bench</h2>
                <span className="coins-sm">🔩 {save.bait?.scrap || 0} scrap</span>
                <button className="x" onClick={() => setPanel(null)}>✕</button>
              </div>
              {save.bait?.active && (
                <div className="bait-active">
                  <span className="bait-active-ico">{baitById(save.bait.active.id)?.icon}</span>
                  <div className="bait-active-info">
                    <b>{baitById(save.bait.active.id)?.name} active</b>
                    <div className="bait-charges">
                      <span className="bait-fill" style={{
                        width: `${(save.bait.active.charges / (baitById(save.bait.active.id)?.charges || 1)) * 100}%`,
                      }} />
                      <span className="bait-count">{save.bait.active.charges} casts left</span>
                    </div>
                  </div>
                </div>
              )}
              {BAITS.map((b) => {
                const afford = (save.bait?.scrap || 0) >= b.scrap
                return (
                  <div key={b.id} className="shop-row">
                    <div className="shop-ico">{b.icon}</div>
                    <div className="shop-info">
                      <div className="shop-name">{b.name}</div>
                      <div className="shop-desc">{b.desc}</div>
                      <div className="bait-stats">
                        <span>🍀 +{b.luck.toFixed(1)}</span>
                        <span>🎣 +{Math.round(b.bite * 100)}%</span>
                        <span>🎯 {b.target}</span>
                        <span>⏳ {b.charges} casts</span>
                      </div>
                    </div>
                    <button className="btn small" disabled={!afford} onClick={() => craftBait(b)}>🔩 {b.scrap}</button>
                  </div>
                )
              })}
              <p className="quest-note">Junk catches yield {SCRAP_PER_TRASH} scrap each. Crafting replaces any active bait.</p>
            </div>
          </div>
        )}

        {panel === 'cosmetics' && (
          <div className="overlay" onClick={() => setPanel(null)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2>🚢 Shipyard</h2>
                <span className="coins-sm">🪙 {save.coins}</span>
                <button className="x" onClick={() => setPanel(null)}>✕</button>
              </div>
              {COSMETIC_GROUPS.map((g) => (
                <div key={g.key} className="dex-zone">
                  <h3>{g.icon} {g.label}</h3>
                  <div className="cos-grid">
                    {g.items.map((item) => {
                      const owned = save.cosmetics.owned.includes(item.id)
                      const equipped = save.cosmetics.equipped[g.key] === item.id
                      const swatches = item.palette
                        ? [item.palette.plankA, item.palette.rail, item.palette.stripe]
                        : item.colors || [item.lit, item.litHi]
                      return (
                        <div
                          key={item.id}
                          className={'cos-cell' + (equipped ? ' equipped' : '') + (owned ? ' owned' : '')}
                          onClick={() => (owned ? equipCosmetic(g.key, item) : buyCosmetic(g.key, item))}
                        >
                          <div className="cos-swatches">
                            {swatches.filter(Boolean).map((c, i) => (
                              <span key={i} className="cos-sw" style={{ background: c }} />
                            ))}
                          </div>
                          <div className="cos-name">{item.name}</div>
                          <div className="cos-tag">
                            {equipped ? <span className="cos-eq">EQUIPPED</span>
                              : owned ? <span className="cos-own">owned — tap to wear</span>
                                : <span className={save.coins >= item.cost ? 'cos-buy' : 'cos-poor'}>🪙 {item.cost}</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              <p className="quest-note">Cosmetic only — no effect on fishing. Your boat, your rules.</p>
            </div>
          </div>
        )}

        {panel === 'prestige' && (() => {
          const st = prestigeStatus(save)
          return (
            <div className="overlay" onClick={() => setPanel(null)}>
              <div className="sheet" onClick={(e) => e.stopPropagation()}>
                <div className="sheet-head">
                  <h2>⛵ New Voyage</h2>
                  <span className="coins-sm">×{st.currentMult.toFixed(2)}</span>
                  <button className="x" onClick={() => setPanel(null)}>✕</button>
                </div>
                <div className="voyage-hero">
                  <div className="voyage-mult">×{st.currentMult.toFixed(2)}</div>
                  <div className="voyage-sub">
                    {st.current} voyage{st.current === 1 ? '' : 's'} completed
                    {' · '}next: <b>×{st.nextMult.toFixed(2)}</b>
                  </div>
                </div>
                <div className="voyage-reqs">
                  <div className={'vreq' + (st.zonesOk ? ' ok' : '')}>
                    <span>{st.zonesOk ? '✓' : '○'} Unlock every zone</span>
                    <b>{st.zonesOpen}/{st.zonesTotal}</b>
                  </div>
                  <div className={'vreq' + (st.speciesOk ? ' ok' : '')}>
                    <span>{st.speciesOk ? '✓' : '○'} Discover {st.speciesNeeded} species</span>
                    <b>{st.species}/{st.speciesNeeded}</b>
                  </div>
                </div>
                <div className="voyage-cols">
                  <div className="voyage-col lose">
                    <h4>Reset</h4>
                    <ul><li>Coins</li><li>Zone unlocks</li><li>Tackle upgrades</li></ul>
                  </div>
                  <div className="voyage-col keep">
                    <h4>Kept</h4>
                    <ul><li>Fishdex</li><li>Relics &amp; perks</li><li>Aquarium</li><li>Cosmetics</li><li>Achievements</li></ul>
                  </div>
                </div>
                <button className="btn voyage-btn" disabled={!st.ready} onClick={doPrestige}>
                  {st.ready ? `Set sail — permanent +${Math.round(VOYAGE_BONUS * 100)}% coins` : 'Requirements not met'}
                </button>
              </div>
            </div>
          )
        })()}

        {panel === 'crates' && (
          <div className="overlay" onClick={() => setPanel(null)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2>🎁 Salvage Crates</h2>
                <span className="coins-sm">🪙 {save.coins}</span>
                <button className="x" onClick={() => setPanel(null)}>✕</button>
              </div>
              {CRATES.map((c) => {
                const odds = crateOdds(c, perks.crate)
                return (
                  <div key={c.id} className="crate-row">
                    <div className="crate-ico">{c.icon}</div>
                    <div className="crate-info">
                      <div className="crate-name">{c.name}</div>
                      <div className="crate-desc">{c.desc}</div>
                      <div className="odds-bar" title="drop chances">
                        {odds.filter((o) => o.pct > 0).map((o) => (
                          <span
                            key={o.rarity}
                            className="odds-seg"
                            style={{ width: `${o.pct}%`, background: RELIC_RARITY[o.rarity].color }}
                            title={`${RELIC_RARITY[o.rarity].label} ${o.pct.toFixed(1)}%`}
                          />
                        ))}
                      </div>
                    </div>
                    <button className="btn small" disabled={save.coins < c.cost} onClick={() => buyCrate(c)}>
                      🪙 {c.cost}
                    </button>
                  </div>
                )
              })}
              <p className="quest-note">
                Duplicates melt into coins. {perks.crate > 0 && `Relic bonus: +${Math.round(perks.crate * 100)}% crate luck.`}
              </p>
            </div>
          </div>
        )}

        {panel === 'hall' && (
          <div className="overlay" onClick={() => setPanel(null)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2>🏛️ Hall of Fame</h2>
                <span className="coins-sm">{ownedRelicIds.length}/{RELICS.length}</span>
                <button className="x" onClick={() => setPanel(null)}>✕</button>
              </div>
              <div className="perk-summary">
                {[['coin', '🪙 coins'], ['luck', '🍀 luck'], ['bite', '🎣 bite'], ['shiny', '✨ shiny'], ['crate', '🎁 crate']]
                  .filter(([k]) => perks[k] > 0)
                  .map(([k, label]) => (
                    <span key={k} className="perk-chip">
                      {label} +{k === 'luck' ? perks[k].toFixed(1) : `${(perks[k] * 100).toFixed(k === 'shiny' ? 1 : 0)}%`}
                    </span>
                  ))}
                {ownedRelicIds.length === 0 && <span className="perk-empty">No relics yet — open a crate to start the collection.</span>}
              </div>
              <div className="set-list">
                {SET_BONUSES.map((s) => {
                  const group = RELICS.filter((r) => r.rarity === s.tier)
                  const got = group.filter((r) => save.relics[r.id]).length
                  const done = sets.some((c) => c.tier === s.tier)
                  return (
                    <div key={s.tier} className={'set-row' + (done ? ' done' : '')}
                      style={done ? { borderColor: RELIC_RARITY[s.tier].color } : undefined}>
                      <span className="set-ico">{s.icon}</span>
                      <span className="set-name">{s.name}</span>
                      <span className="set-perk">{perkLabel(s.perk)}</span>
                      <span className="set-prog" style={{ color: done ? RELIC_RARITY[s.tier].color : undefined }}>
                        {got}/{group.length}
                      </span>
                    </div>
                  )
                })}
              </div>
              {RELIC_TIERS.map((tier) => {
                const group = RELICS.filter((r) => r.rarity === tier)
                if (!group.length) return null
                const got = group.filter((r) => save.relics[r.id]).length
                return (
                  <div key={tier} className="dex-zone">
                    <h3 style={{ color: RELIC_RARITY[tier].color }}>
                      {RELIC_RARITY[tier].label} <span className="tier-count">{got}/{group.length}</span>
                    </h3>
                    <div className="dex-grid relic-grid">
                      {group.map((r) => {
                        const owned = save.relics[r.id]
                        return (
                          <div
                            key={r.id}
                            className={'dex-cell relic-cell' + (owned ? ' caught' : ' unknown')}
                            style={owned ? { borderColor: RELIC_RARITY[tier].color } : undefined}
                            onClick={() => owned && setRelicDetail(r)}
                          >
                            <div className="dex-sprite">
                              {owned ? <PixelFish fish={r} scale={3} /> : <span className="qmark">?</span>}
                            </div>
                            <div className="dex-label">
                              {owned ? r.name : '???'}
                              {owned && owned.count > 1 && <span className="dex-count">×{owned.count}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {relicDetail && (
          <div className="overlay" onClick={() => setRelicDetail(null)}>
            <div className="sheet detail" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2 style={{ color: RELIC_RARITY[relicDetail.rarity].color }}>{relicDetail.name}</h2>
                <button className="x" onClick={() => setRelicDetail(null)}>✕</button>
              </div>
              <div className="detail-body">
                <div className="detail-sprite"><PixelFish fish={relicDetail} scale={7} /></div>
                <div className="detail-stats">
                  <div><span>Rarity</span><b style={{ color: RELIC_RARITY[relicDetail.rarity].color }}>{RELIC_RARITY[relicDetail.rarity].label}</b></div>
                  <div><span>Perk</span><b style={{ color: '#5fd3ff' }}>{perkLabel(relicDetail.perk)}</b></div>
                  <div><span>Owned</span><b>×{save.relics[relicDetail.id]?.count || 0}</b></div>
                  <div><span>Melt value</span><b>🪙 {RELIC_RARITY[relicDetail.rarity].dust}</b></div>
                </div>
              </div>
              <p className="detail-blurb">{relicDetail.blurb}</p>
            </div>
          </div>
        )}

        {reveal && (
          <div className="overlay reveal-overlay" onClick={() => setReveal(null)}>
            <div
              key={reveal.key}
              className={'reveal-card r-' + reveal.rarity}
              style={{ borderColor: RELIC_RARITY[reveal.rarity].color, boxShadow: `0 0 40px ${RELIC_RARITY[reveal.rarity].color}66` }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="reveal-rarity" style={{ color: RELIC_RARITY[reveal.rarity].color }}>
                {RELIC_RARITY[reveal.rarity].label}
              </div>
              <div className="reveal-sprite"><PixelFish fish={reveal.relic} scale={8} /></div>
              <div className="reveal-name">{reveal.relic.name}</div>
              <div className="reveal-perk">{perkLabel(reveal.relic.perk)}</div>
              {reveal.duplicate
                ? <div className="reveal-dup">Duplicate — melted for 🪙 {reveal.dust}</div>
                : <div className="reveal-new">NEW RELIC</div>}
              <button className="btn small" onClick={() => setReveal(null)}>Nice</button>
            </div>
          </div>
        )}

        {panel === 'quests' && (
          <div className="overlay" onClick={() => setPanel(null)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2>📜 Daily Quests</h2>
                <span className="coins-sm">{qKey}</span>
                <button className="x" onClick={() => setPanel(null)}>✕</button>
              </div>
              {quests.map((q) => {
                const prog = save.quests.progress[q.id] || 0
                const done = prog >= q.goal
                const claimed = save.quests.claimed.includes(q.id)
                return (
                  <div key={q.id} className={'quest-row' + (claimed ? ' claimed' : done ? ' done' : '')}>
                    <div className="quest-info">
                      <div className="quest-desc">{q.desc}</div>
                      <div className="quest-bar">
                        <span className="quest-fill" style={{ width: `${Math.min(100, (prog / q.goal) * 100)}%` }} />
                        <span className="quest-count">{Math.min(prog, q.goal)}/{q.goal}</span>
                      </div>
                    </div>
                    {claimed ? (
                      <div className="quest-check">✓</div>
                    ) : (
                      <button className="btn small" disabled={!done} onClick={() => claimQuest(q)}>
                        🪙 {q.reward}
                      </button>
                    )}
                  </div>
                )
              })}
              <p className="quest-note">New quests every day — progress resets at midnight.</p>
            </div>
          </div>
        )}

        {panel === 'shop' && (
          <div className="overlay" onClick={() => setPanel(null)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2>🛒 Tackle Shop</h2>
                <span className="coins-sm">🪙 {save.coins}</span>
                <button className="x" onClick={() => setPanel(null)}>✕</button>
              </div>
              {SHOP.map((item) => {
                const level = save.upgrades[item.key]
                const cost = nextCost(item, level)
                const maxed = cost == null
                return (
                  <div key={item.key} className="shop-row">
                    <div className="shop-ico">{item.icon}</div>
                    <div className="shop-info">
                      <div className="shop-name">
                        {item.name}
                        <span className="dots">
                          {Array.from({ length: MAX_LEVEL }).map((_, i) => (
                            <span key={i} className={'dot' + (i < level ? ' on' : '')} />
                          ))}
                        </span>
                      </div>
                      <div className="shop-desc">{item.desc}</div>
                    </div>
                    <button className="btn small" disabled={maxed || save.coins < cost} onClick={() => buyUpgrade(item)}>
                      {maxed ? 'MAX' : `🪙 ${cost}`}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {panel === 'ach' && (
          <div className="overlay" onClick={() => setPanel(null)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2>🏆 Achievements</h2>
                <span className="coins-sm">{save.achievements.length}/{ACHIEVEMENTS.length}</span>
                <button className="x" onClick={() => setPanel(null)}>✕</button>
              </div>
              {ACHIEVEMENTS.map((a) => {
                const got = save.achievements.includes(a.id)
                return (
                  <div key={a.id} className={'ach-row' + (got ? ' got' : '')}>
                    <div className="ach-ico">{got ? a.icon : '🔒'}</div>
                    <div className="ach-info">
                      <div className="ach-name">{a.name}</div>
                      <div className="ach-desc">{a.desc}</div>
                    </div>
                    {got && <div className="ach-check">✓</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {panel === 'dex' && (
          <div className="overlay" onClick={() => setPanel(null)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2>📖 Fishdex</h2>
                <span className="coins-sm">{caughtCount}/{FISH.length}</span>
                <button className="x" onClick={() => setPanel(null)}>✕</button>
              </div>
              <div className="dex-controls">
                <div className="dex-filters">
                  {['all', 'caught', 'missing', 'legendary', 'epic', 'rare'].map((f) => (
                    <button
                      key={f}
                      className={'filt' + (dexFilter === f ? ' on' : '')}
                      style={dexFilter === f && RARITY[f] ? { borderColor: RARITY[f].color, color: RARITY[f].color } : undefined}
                      onClick={() => setDexFilter(f)}
                    >{f}</button>
                  ))}
                </div>
                <select className="dex-sort" value={dexSort} onChange={(e) => setDexSort(e.target.value)}>
                  <option value="zone">sort: default</option>
                  <option value="rarity">sort: rarity</option>
                  <option value="size">sort: max size</option>
                  <option value="value">sort: value</option>
                  <option value="name">sort: name</option>
                </select>
              </div>
              {ZONES.map((z) => (
                <div key={z.id} className="dex-zone">
                  <h3>{z.icon} {z.name}</h3>
                  <div className="dex-grid">
                    {applyDexView(fishByZone(z.id)).map((f) => {
                      const entry = save.dex[f.id]
                      return (
                        <div
                          key={f.id}
                          className={'dex-cell' + (entry ? ' caught' : ' unknown')}
                          style={entry ? { borderColor: RARITY[f.rarity].color } : undefined}
                          onClick={() => entry && setDetail(f)}
                        >
                          <div className="dex-sprite">
                            {entry ? <PixelFish fish={f} scale={3} /> : <span className="qmark">?</span>}
                          </div>
                          <div className="dex-label">
                            {entry ? f.name : '???'}
                            {entry && <span className="dex-count">×{entry.count} · {entry.record}cm</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {detail && (
          <div className="overlay" onClick={() => setDetail(null)}>
            <div className="sheet detail" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2 style={{ color: RARITY[detail.rarity].color }}>{detail.name}</h2>
                <button className="x" onClick={() => setDetail(null)}>✕</button>
              </div>
              <div className="detail-body">
                <div className="detail-sprite"><PixelFish fish={detail} scale={7} /></div>
                <div className="detail-stats">
                  <div><span>Rarity</span><b style={{ color: RARITY[detail.rarity].color }}>{detail.rarity}</b></div>
                  <div><span>Habitat</span><b>{ZONES.find((z) => z.id === detail.habitat)?.name}</b></div>
                  <div><span>Size</span><b>{detail.minSize}–{detail.maxSize} cm</b></div>
                  <div><span>Value</span><b>🪙 {detail.baseValue}</b></div>
                  <div><span>Fight</span><b>{detail.fight}/10</b></div>
                  {save.dex[detail.id] && <div><span>Your record</span><b>{save.dex[detail.id].record} cm</b></div>}
                </div>
              </div>
              <p className="detail-blurb">{blurb(detail)}</p>
              {save.dex[detail.id] && (
                <button 
                  className="btn small" 
                  style={{ width: '100%', marginTop: '12px' }}
                  onClick={() => exportCatchCard(detail, save.dex[detail.id].record, save.dex[detail.id].shiny)}
                >
                  Download Catch Card
                </button>
              )}
            </div>
          </div>
        )}

        {panel === 'stats' && (
          <div className="overlay" onClick={() => setPanel(null)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2>📊 Stats</h2>
                <button className="x" onClick={() => setPanel(null)}>✕</button>
              </div>
              <div className="stat-grid">
                <div className="stat"><span>Fish caught</span><b>{totalCaught}</b></div>
                <div className="stat"><span>Species</span><b>{caughtCount}/{FISH.length}</b></div>
                <div className="stat"><span>Coins earned</span><b>🪙 {save.stats.coinsEarned || 0}</b></div>
                <div className="stat"><span>Shinies</span><b>✨ {save.stats.shinies}</b></div>
                <div className="stat"><span>Best streak</span><b>🔥 {save.stats.maxStreak}</b></div>
                <div className="stat"><span>Achievements</span><b>{save.achievements.length}/{ACHIEVEMENTS.length}</b></div>
                <div className="stat"><span>Treasures</span><b>💰 {save.stats.treasure || 0}</b></div>
                <div className="stat"><span>Junk hauled</span><b>🗑️ {save.stats.trash || 0}</b></div>
                <div className="stat"><span>Quests done</span><b>📜 {save.stats.questsDone || 0}</b></div>
                <div className="stat"><span>Zones open</span><b>🗺️ {save.unlocked.length}/{ZONES.length}</b></div>
                <div className="stat"><span>Relics</span><b>🏛️ {ownedRelicIds.length}/{RELICS.length}</b></div>
                <div className="stat"><span>Crates opened</span><b>🎁 {save.crateStats.opened || 0}</b></div>
                <div className="stat wide"><span>Biggest catch</span><b>{biggestFish ? `${biggestFish.name} · ${biggestEntry.rec} cm` : '—'}</b></div>
                <div className="stat wide"><span>Favorite zone</span><b>{favZone ? ZONES.find((z) => z.id === favZone[0])?.name : '—'}</b></div>
              </div>
            </div>
          </div>
        )}

        {panel === 'settings' && (
          <div className="overlay" onClick={() => setPanel(null)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2>⚙️ Settings</h2>
                <button className="x" onClick={() => setPanel(null)}>✕</button>
              </div>
              <div className="set-row">
                <label>SFX Volume</label>
                <input
                  type="range" min="0" max="100" value={Math.round(save.volume * 100)}
                  onChange={(e) => { const v = +e.target.value / 100; sfx.setVolume(v); setSave((s) => ({ ...s, volume: v })) }}
                />
                <span className="set-val">{Math.round(save.volume * 100)}</span>
              </div>
              <div className="set-row">
                <label>Music Volume</label>
                <input
                  type="range" min="0" max="100" value={Math.round((save.musicVolume ?? 0.5) * 100)}
                  onChange={(e) => { const v = +e.target.value / 100; if(sfx.setMusicVolume) sfx.setMusicVolume(v); setSave((s) => ({ ...s, musicVolume: v })) }}
                />
                <span className="set-val">{Math.round((save.musicVolume ?? 0.5) * 100)}</span>
              </div>
              <div className="set-row">
                <label>Difficulty</label>
                <div className="seg">
                  {['easy', 'normal', 'hard'].map((d) => (
                    <button key={d} className={'seg-btn' + (save.difficulty === d ? ' on' : '')} onClick={() => setSave((s) => ({ ...s, difficulty: d }))}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="set-row">
                <label>Colorblind Mode</label>
                <button className={'seg-btn' + (save.colorblind ? ' on' : '')} onClick={() => setSave((s) => ({ ...s, colorblind: !s.colorblind }))}>
                  {save.colorblind ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="set-row io-row">
                <label>Backup</label>
                <div className="io-actions">
                  <button className="btn small" onClick={exportSave}>Copy save code</button>
                  <button className="btn small" onClick={() => {
                    const t = window.prompt('Paste a save code:')
                    if (t) importSave(t)
                  }}>Import</button>
                </div>
              </div>
              {ioMsg && <p className="io-msg">{ioMsg}</p>}
              <div className="set-row">
                <label>Progress</label>
                <button
                  className="btn small danger"
                  onClick={() => { if (window.confirm('Erase ALL progress? This cannot be undone.')) { setSave({ ...DEFAULT, tutorialSeen: true }); setStreak(0); setPanel(null) } }}
                >Reset save</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="tipbar">Tap the water to cast · deeper taps sink lower · hold to reel on a bite</p>

      {achToast && (
        <div className="ach-toast">
          <span className="ach-toast-ico">{achToast.icon}</span>
          <span><b>Achievement unlocked!</b><br />{achToast.name}</span>
        </div>
      )}
    </div>
  )
}
