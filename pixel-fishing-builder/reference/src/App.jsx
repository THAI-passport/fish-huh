import { useEffect, useState, useRef } from 'react'
import { ZONES, RARITY } from './data/zones.js'
import { FISH, fishByZone } from './data/fish.js'
import { SHOP, MAX_LEVEL, nextCost } from './data/shop.js'
import { ACHIEVEMENTS } from './data/achievements.js'
import { blurb } from './data/blurbs.js'
import { catchValue } from './game.js'
import Scene from './scene/Scene.jsx'
import PixelFish from './pixel/PixelFish.jsx'
import * as sfx from './audio/sfx.js'

const SAVE_KEY = 'pixel-fishing-save-v4'
const DEFAULT = {
  coins: 0, unlocked: ['fresh'], dex: {},
  upgrades: { rod: 0, line: 0, bait: 0 },
  stats: { maxStreak: 0, shinies: 0, coinsEarned: 0 },
  achievements: [],
  tutorialSeen: false,
  difficulty: 'normal',
  volume: 0.8,
}
const SHINY_CHANCE = 0.025
const GOLD = { body: '#f4cf4a', fin: '#fff2a8', tail: '#ffdf5c', dark: '#8a6a10' }

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        ...DEFAULT, ...p,
        upgrades: { ...DEFAULT.upgrades, ...(p.upgrades || {}) },
        stats: { ...DEFAULT.stats, ...(p.stats || {}) },
        achievements: p.achievements || [],
      }
    }
  } catch {}
  return DEFAULT
}

function displayFish(fish, shiny) {
  return shiny ? { ...fish, palette: GOLD } : fish
}

export default function App() {
  const [save, setSave] = useState(loadSave)
  const [zone, setZone] = useState('fresh')
  const [popup, setPopup] = useState(null)
  const [panel, setPanel] = useState(null) // 'dex' | 'shop' | null
  const [muted, setMuted] = useState(false)
  const [streak, setStreak] = useState(0)
  const [achToast, setAchToast] = useState(null)
  const [floats, setFloats] = useState([])
  const floatId = useRef(0)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)) } catch {}
  }, [save])
  useEffect(() => { sfx.setMuted(muted) }, [muted])
  useEffect(() => { sfx.setVolume(save.volume) }, [save.volume])

  // Evaluate achievements whenever progress changes.
  useEffect(() => {
    const dexIds = Object.keys(save.dex)
    const x = {
      total: Object.values(save.dex).reduce((s, e) => s + e.count, 0),
      species: dexIds.length,
      totalSpecies: FISH.length,
      biggest: Object.values(save.dex).reduce((m, e) => Math.max(m, e.record), 0),
      zonesFished: new Set(dexIds.map((id) => FISH.find((f) => f.id === id)?.habitat)).size,
      legendary: dexIds.some((id) => FISH.find((f) => f.id === id)?.rarity === 'legendary'),
      maxStreak: save.stats.maxStreak,
      shinies: save.stats.shinies,
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

  function handleResult(fish, size, landed) {
    const prev = save.dex[fish.id]
    const isNew = landed && !prev
    const isRecord = landed && (!prev || size > prev.record)
    if (landed) {
      const shiny = Math.random() < SHINY_CHANCE
      const newStreak = streak + 1
      const mult = 1 + Math.min(newStreak - 1, 9) * 0.1 // +10% per catch in a row, cap +90%
      const value = Math.round(catchValue(fish, size) * mult * (shiny ? 5 : 1))
      setStreak(newStreak)
      setPopup({ fish, size, value, landed, isNew, isRecord, mult, shiny })
      const fid = ++floatId.current
      setFloats((f) => [...f, { id: fid, amount: value }])
      setTimeout(() => setFloats((f) => f.filter((x) => x.id !== fid)), 1200)
      setSave((s) => {
        const p = s.dex[fish.id] || { count: 0, record: 0, shiny: false }
        return {
          ...s,
          coins: s.coins + value,
          dex: { ...s.dex, [fish.id]: { count: p.count + 1, record: Math.max(p.record, size), shiny: p.shiny || shiny } },
          stats: {
            ...s.stats,
            maxStreak: Math.max(s.stats.maxStreak, newStreak),
            shinies: s.stats.shinies + (shiny ? 1 : 0),
            coinsEarned: (s.stats.coinsEarned || 0) + value,
          },
        }
      })
    } else {
      setStreak(0)
      setPopup({ fish, size, value: 0, landed, isNew, isRecord, mult: 1, shiny: false })
    }
    setTimeout(() => setPopup(null), 2600)
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

  return (
    <div className="app">
      <header className="topbar">
        <h1>🎣 PIXEL FISHING</h1>
        <div className="top-right">
          <div className="coin-floats">
            {floats.map((f) => <span key={f.id} className="coin-float">+{f.amount} 🪙</span>)}
          </div>
          {streak > 1 && <div className="chip streak">🔥 {streak}</div>}
          <div className="chip coins">🪙 {save.coins}</div>
          <button className="chip icon" title="Tackle Shop" onClick={() => setPanel(panel === 'shop' ? null : 'shop')}>🛒</button>
          <button className="chip icon" title="Fishdex" onClick={() => setPanel(panel === 'dex' ? null : 'dex')}>📖</button>
          <button className="chip icon" title="Achievements" onClick={() => setPanel(panel === 'ach' ? null : 'ach')}>🏆</button>
          <button className="chip icon" title="Stats" onClick={() => setPanel(panel === 'stats' ? null : 'stats')}>📊</button>
          <button className="chip icon" title="Settings" onClick={() => setPanel(panel === 'settings' ? null : 'settings')}>⚙️</button>
          <button className="chip icon" title="Sound" onClick={() => setMuted((m) => !m)}>{muted ? '🔇' : '🔊'}</button>
        </div>
      </header>

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
              <span className="zt-name">{z.short}</span>
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
              </ol>
              <button className="btn" onClick={() => setSave((s) => ({ ...s, tutorialSeen: true }))}>Got it!</button>
            </div>
          </div>
        )}
        {unlocked ? (
          <Scene zone={zoneData} onResult={handleResult} upgrades={save.upgrades} difficulty={save.difficulty} />
        ) : (
          <div className="locked-panel" style={{ background: `linear-gradient(#0c2740, ${zoneData.bg})` }}>
            <p>{zoneData.name} is locked.</p>
            <button className="btn" disabled={save.coins < zoneData.unlockCost} onClick={() => unlockZone(zoneData)}>
              Unlock for 🪙 {zoneData.unlockCost}
            </button>
            <p className="sub">Earn coins by catching fish in your unlocked zones.</p>
          </div>
        )}

        {popup && (
          <div className={'popup ' + (popup.landed ? 'good' : 'bad')} style={popup.landed ? { boxShadow: `0 0 26px ${RARITY[popup.fish.rarity].color}55` } : undefined}>
            {popup.landed ? (
              <>
                {popup.shiny && <div className="badge shiny">✨ SHINY ✨</div>}
                {!popup.shiny && popup.isNew && <div className="badge new">NEW!</div>}
                {!popup.shiny && !popup.isNew && popup.isRecord && <div className="badge rec">RECORD!</div>}
                <PixelFish fish={displayFish(popup.fish, popup.shiny)} scale={6} />
                <div className="popup-name" style={{ color: popup.shiny ? '#ffd23c' : RARITY[popup.fish.rarity].color }}>
                  {popup.shiny ? 'Shiny ' : ''}{popup.fish.name}
                </div>
                <div className="popup-meta">{popup.fish.rarity} · {popup.size} cm · 🪙 {popup.value}</div>
                {popup.mult > 1 && <div className="popup-mult">🔥 streak ×{popup.mult.toFixed(1)}</div>}
              </>
            ) : (
              <div className="popup-away">The {popup.fish.name} got away!</div>
            )}
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
              {ZONES.map((z) => (
                <div key={z.id} className="dex-zone">
                  <h3>{z.name}</h3>
                  <div className="dex-grid">
                    {fishByZone(z.id).map((f) => {
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
                <label>Volume</label>
                <input
                  type="range" min="0" max="100" value={Math.round(save.volume * 100)}
                  onChange={(e) => { const v = +e.target.value / 100; sfx.setVolume(v); setSave((s) => ({ ...s, volume: v })) }}
                />
                <span className="set-val">{Math.round(save.volume * 100)}</span>
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
