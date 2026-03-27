import { useState, useEffect } from 'react'

const STEPS = [
  { title: 'Welcome to SHARDFALL V2! 🌀', body: 'Dimensional Portals drop magical Gems. Build Constructs, stabilize Portals, and complete secret Contracts to win! V2 adds negotiation, scarcity, and hidden objectives.', target: null, position: 'center' },
  { title: '🆕 Portal Claims & Tolls', body: 'When you HARVEST from a Portal, you CLAIM it (colored border). Other players must pay you a 1-gem TOLL to harvest from your claimed Portal. This creates negotiation and territory!\n\nClaims clear at the end of each round.', target: null, position: 'center' },
  { title: '🆕 Hand Limit (10)', body: 'You can hold MAX 10 gems. If you go over, you must discard down. Plan your harvests carefully! Some constructs raise this limit.\n\nTip: Trade excess gems instead of discarding them.', target: null, position: 'center' },
  { title: '🆕 Secret Contracts 📜', body: 'You have 2 secret objectives. Complete them for bonus VP (3-8 each). FAIL them and lose 2 VP each!\n\nClick "Show Contracts" in the player panel to review yours. Keep them secret from other players!', target: null, position: 'center' },
  { title: 'The Portal Zone 🌀', body: 'Portals produce Gems of their type. Stability (pips) drops when harvested. At 0 → COLLAPSE → Fracture +1!\n\n🔖 Colored border = CLAIMED by that player. You\'ll pay a toll to harvest.', target: '#portal-zone', position: 'below' },
  { title: 'Gem Market 💎', body: 'COLLECT takes 1 gem from here. The market is smaller — harvesting is now the main gem source. Build "Gem Lens" to collect 2 again!', target: '#gem-market-section', position: 'below' },
  { title: '🆕 Construct Tier Gating 🏗️', body: 'Constructs have tiers: Small → Medium → Large.\n\n🔒 You must build 2 Small before any Medium.\n🔒 You must have 2 Small + 1 Medium before any Large.\n\nBuild the required number of constructs to trigger the end game!', target: '#construct-display', position: 'below' },
  { title: 'Fracture Track 💀', body: 'Shared threat. If it hits the threshold, game ends and ALL players lose 5 VP. Stabilize portals to prevent this — but it costs gems and an action!', target: '#fracture-track', position: 'below' },
  { title: 'Your Actions ⚡', body: '2 actions per turn. Choose from:\n\n💎 COLLECT — Take 1 gem from market\n⛏️ HARVEST — Harvest from a Portal (claims it!)\n🏗️ BUILD — Build a construct (tier gated)\n🛡️ STABILIZE — Heal a Portal, earn Guardian Token\n🤝 TRADE — Bank trade (3:1)\n🔧 CONVERT — Free! (with Gem Forge)', target: '#action-bar', position: 'above' },
  { title: 'Strategy Tips 💡', body: '• Claim valuable portals early — earn toll income!\n• Watch your hand limit — trade excess, don\'t discard\n• Build Small constructs first for their abilities\n• Track what contracts others might have\n• Hold Shift to Deep Harvest (4 gems, -2 stability)\n• The Diplomat Seeker is immune to tolls!', target: null, position: 'center' },
  { title: 'Ready to Play! 🚀', body: 'V2 is designed for interaction — negotiate tolls, trade gems, race for constructs. Every turn is a conversation!\n\nClick ❓ anytime to reopen this tutorial.', target: null, position: 'center' },
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
    if (cur.position === 'below') return { top: rect.top + rect.height + 16, left: Math.max(16, Math.min(rect.left, window.innerWidth - 380)) }
    if (cur.position === 'above') return { bottom: window.innerHeight - rect.top + 16, left: Math.max(16, Math.min(rect.left, window.innerWidth - 380)) }
    if (cur.position === 'left') return { top: rect.top, right: Math.max(16, window.innerWidth - rect.left + 16) }
    return {}
  }

  return (
    <>
      <div className="tutorial-overlay" onClick={onClose} />
      {rect && <div className="tutorial-spotlight" style={rect} />}
      <div className="tutorial-tooltip" style={{...pos(), maxWidth: 'calc(100vw - 32px)'}}>
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
