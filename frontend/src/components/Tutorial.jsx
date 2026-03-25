import { useState, useEffect } from 'react'

const STEPS = [
  { title: 'Welcome to SHARDFALL V2! 🌀', body: 'Dimensional rifts drop magical Shards. Build Constructs, stabilize rifts, and complete secret Contracts to win! V2 adds negotiation, scarcity, and hidden objectives.', target: null, position: 'center' },
  { title: '🆕 Rift Claims & Tolls', body: 'When you EXTRACT from a Rift, you CLAIM it (colored border). Other players must pay you a 1-shard TOLL to extract from your claimed rift. This creates negotiation and territory!\n\nClaims clear at the end of each round.', target: null, position: 'center' },
  { title: '🆕 Hand Limit (10)', body: 'You can hold MAX 10 shards. If you go over, you must discard down. Plan your extractions carefully! Some constructs raise this limit.\n\nTip: Trade excess shards instead of discarding them.', target: null, position: 'center' },
  { title: '🆕 Secret Contracts 📜', body: 'You have 2 secret objectives. Complete them for bonus VP (3-8 each). FAIL them and lose 2 VP each!\n\nClick "Show Contracts" in the player panel to review yours. Keep them secret from other players!', target: null, position: 'center' },
  { title: 'The Rift Zone 🌀', body: 'Rifts produce Shards of their type. Stability (pips) drops when extracted. At 0 → COLLAPSE → Fracture +1!\n\n🔖 Colored border = CLAIMED by that player. You\'ll pay a toll to extract.', target: '#rift-zone', position: 'below' },
  { title: 'Shard Market 💎', body: 'GATHER takes 1 shard from here (nerfed from V1\'s 2). The market is smaller — extraction is now the main shard source. Build "Shard Lens" to gather 2 again!', target: '#shard-market', position: 'below' },
  { title: '🆕 Construct Tier Gating 🏗️', body: 'Constructs have tiers: Small → Medium → Large.\n\n🔒 You must build 2 Small before any Medium.\n🔒 You must have 2 Small + 1 Medium before any Large.\n\nBuild 7 constructs total to trigger the end game!', target: '#construct-display', position: 'below' },
  { title: 'Fracture Track 💀', body: 'Shared threat. If it hits the threshold, game ends and ALL players lose 5 VP. Stabilize rifts to prevent this — but it costs shards and an action!', target: '#fracture-track', position: 'below' },
  { title: 'Your Actions ⚡', body: '2 actions per turn. Choose from:\n\n💎 GATHER — Take 1 shard from market\n⛏️ EXTRACT — Harvest from a rift (claims it!)\n🏗️ BUILD — Build a construct (tier gated)\n🛡️ STABILIZE — Heal a rift, earn Guardian Token\n🤝 TRADE — Bank trade (3:1)\n🔧 CONVERT — Free! (with Shard Forge)', target: '#action-bar', position: 'above' },
  { title: 'Strategy Tips 💡', body: '• Claim valuable rifts early — earn toll income!\n• Watch your hand limit — trade excess, don\'t discard\n• Build Small constructs first for their abilities\n• Track what contracts others might have\n• Hold Shift to Deep Extract (4 shards, -2 stability)\n• The Diplomat Seeker is immune to tolls!', target: null, position: 'center' },
  { title: 'Ready to Play! 🚀', body: 'V2 is designed for interaction — negotiate tolls, trade shards, race for constructs. Every turn is a conversation!\n\nClick ❓ anytime to reopen this tutorial.', target: null, position: 'center' },
]

export default function Tutorial({ onClose }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)
  const cur = STEPS[step]

  useEffect(() => {
    if (cur.target) {
      const el = document.querySelector(cur.target)
      if (el) { const r = el.getBoundingClientRect(); setRect({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 }) }
      else setRect(null)
    } else setRect(null)
  }, [step, cur.target])

  const pos = () => {
    if (!rect || cur.position === 'center') return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    if (cur.position === 'below') return { top: rect.top + rect.height + 16, left: Math.min(rect.left, window.innerWidth - 400) }
    if (cur.position === 'above') return { bottom: window.innerHeight - rect.top + 16, left: Math.min(rect.left, window.innerWidth - 400) }
    if (cur.position === 'left') return { top: rect.top, right: window.innerWidth - rect.left + 16 }
    return {}
  }

  return (
    <>
      <div className="tutorial-overlay" onClick={onClose} />
      {rect && <div className="tutorial-spotlight" style={rect} />}
      <div className="tutorial-tooltip" style={pos()}>
        <h3>{cur.title}</h3>
        <p style={{ whiteSpace: 'pre-line' }}>{cur.body}</p>
        <div className="tutorial-nav">
          <span className="tutorial-progress">{step + 1} / {STEPS.length}</span>
          <div className="tutorial-nav-buttons">
            {step > 0 && <button className="btn btn-small btn-outline" onClick={() => setStep(s => s - 1)}>← Back</button>}
            {step < STEPS.length - 1 ? (
              <><button className="btn btn-small btn-outline" onClick={onClose}>Skip</button>
              <button className="btn btn-small btn-primary" onClick={() => setStep(s => s + 1)}>Next →</button></>
            ) : <button className="btn btn-small btn-success" onClick={onClose}>Got It! 🎮</button>}
          </div>
        </div>
      </div>
    </>
  )
}
