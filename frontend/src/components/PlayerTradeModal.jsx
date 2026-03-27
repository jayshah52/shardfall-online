import React, { useState } from 'react'

const GEM_TYPES = ['ember', 'tide', 'verdant', 'storm', 'void']
const GEM_ICONS = { ember: '🔥', tide: '💧', verdant: '🌿', storm: '⚡', void: '🔮' }
const GEM_LABELS = { ember: 'Ember', tide: 'Tide', verdant: 'Verdant', storm: 'Storm', void: 'Void' }

export default function PlayerTradeModal({ state, myPlayer, onAct, onClose }) {
  const [give, setGive] = useState({})
  const [request, setRequest] = useState({})
  
  const activeTrade = state.active_trade
  const isInitiator = activeTrade && activeTrade.initiator === myPlayer.index
  const currentResponse = activeTrade?.responses?.[String(myPlayer.index)]

  const adjustAmt = (obj, setter, type, delta) => {
    setter(prev => {
      const v = (prev[type] || 0) + delta
      const max = delta > 0 && obj === give ? (myPlayer.gems?.[type] || 0) : 99
      if (v < 0 || v > max) return prev
      const n = { ...prev, [type]: v }
      if (n[type] === 0) delete n[type]
      return n
    })
  }

  const renderGemSelectors = (label, obj, setter, isGive) => (
    <div className="trade-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
      <label>{label}</label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
        {GEM_TYPES.map(t => {
          const amt = obj[t] || 0
          const have = myPlayer.gems?.[t] || 0
          const canAdd = isGive ? amt < have : true
          return (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
              <span>{GEM_ICONS[t]}</span>
              <button disabled={amt <= 0} onClick={() => adjustAmt(obj, setter, t, -1)} style={{ width: 24, height: 24, padding: 0, borderRadius: '4px' }}>-</button>
              <span style={{ minWidth: 16, textAlign: 'center' }}>{amt}</span>
              <button disabled={!canAdd} onClick={() => adjustAmt(obj, setter, t, 1)} style={{ width: 24, height: 24, padding: 0, borderRadius: '4px' }}>+</button>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderOfferStr = (offer_obj) => {
    const parts = Object.entries(offer_obj).map(([t, c]) => `${c} ${GEM_ICONS[t]}`)
    return parts.length > 0 ? parts.join(', ') : "Nothing"
  }

  // 1) NO ACTIVE TRADE: Initiator creating offer
  if (!activeTrade) {
    const isOfferValid = Object.keys(give).length > 0 || Object.keys(request).length > 0
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
          <h2>🤝 Player Trade Agreement</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>Propose an open trade to all players. (Free Action)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {renderGemSelectors("You give:", give, setGive, true)}
            {renderGemSelectors("You ask for:", request, setRequest, false)}
          </div>
          <div className="modal-actions" style={{ marginTop: '24px' }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={!isOfferValid} onClick={() => { onAct('trade_player_offer', { give, request }); onClose() }}>Broadcast Offer 📢</button>
          </div>
        </div>
      </div>
    )
  }

  // 2) ACTIVE TRADE: Current initiator reviewing responses
  if (isInitiator) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
          <h2>📢 Your Active Trade</h2>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <div><strong>Giving:</strong> {renderOfferStr(activeTrade.give)}</div>
            <div style={{ marginTop: '4px' }}><strong>Requesting:</strong> {renderOfferStr(activeTrade.request)}</div>
          </div>
          
          <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '12px' }}>Player Responses</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '100px' }}>
            {Object.keys(activeTrade.responses || {}).length === 0 ? (
              <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Waiting for players to respond...</div>
            ) : Object.entries(activeTrade.responses).map(([pid_str, resp]) => {
              const partner = state.players[parseInt(pid_str)]
              if (resp.status === 'reject') return <div key={pid_str} style={{ color: 'var(--text-muted)' }}>❌ {partner.name} rejected</div>
              if (resp.status === 'accept') {
                return (
                  <div key={pid_str} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(39, 174, 96, 0.1)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--success)' }}>
                    <span>✅ <strong>{partner.name}</strong> accepts!</span>
                    <button className="btn btn-small btn-success" onClick={() => onAct('trade_player_confirm', { partner_idx: parseInt(pid_str) })}>Confirm</button>
                  </div>
                )
              }
              if (resp.status === 'counter') {
                const canAffordCounter = Object.entries(resp.request).every(([t, c]) => (myPlayer.gems?.[t] || 0) >= c)
                return (
                  <div key={pid_str} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(243, 156, 18, 0.1)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--warning)' }}>
                    <div>
                      <div>🔄 <strong>{partner.name}</strong> counters:</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>They give: {renderOfferStr(resp.give)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>You give: {renderOfferStr(resp.request)}</div>
                    </div>
                    <button className="btn btn-small btn-warning" disabled={!canAffordCounter} onClick={() => onAct('trade_player_confirm', { partner_idx: parseInt(pid_str) })}>{canAffordCounter ? 'Confirm' : 'Lack Gems'}</button>
                  </div>
                )
              }
              return null
            })}
          </div>
          
          <div className="modal-actions" style={{ marginTop: '24px' }}>
            <button className="btn btn-outline" onClick={onClose}>Hide Modal</button>
            <button className="btn btn-danger" onClick={() => onAct('trade_player_cancel', {})}>Cancel Trade ❌</button>
          </div>
        </div>
      </div>
    )
  }

  // 3) ACTIVE TRADE: Non-initiator responding
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <h2>🤝 Trade Offer from {activeTrade.initiator_name}</h2>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: `4px solid ${state.players[activeTrade.initiator].color}` }}>
          <div><strong>They give:</strong> {renderOfferStr(activeTrade.give)}</div>
          <div style={{ marginTop: '4px' }}><strong>They ask for:</strong> {renderOfferStr(activeTrade.request)}</div>
        </div>

        {currentResponse ? (
          <div>
            <p style={{ textAlign: 'center', color: 'var(--accent)' }}>
              You {currentResponse.status === 'accept' ? '✅ accepted' : currentResponse.status === 'reject' ? '❌ rejected' : '🔄 countered'} this offer. Waiting for {activeTrade.initiator_name} to confirm.
            </p>
            <button className="btn btn-outline" style={{ width: '100%', marginTop: '16px' }} onClick={onClose}>Close</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-success" style={{ flex: 1 }} onClick={() => onAct('respond_trade', { status: 'accept' })}>✅ Accept as is</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => onAct('respond_trade', { status: 'reject' })}>❌ Reject</button>
            </div>
            
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Or Counter Offer:</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {renderGemSelectors("You give:", give, setGive, true)}
                {renderGemSelectors("You ask for:", request, setRequest, false)}
              </div>
              <button className="btn btn-warning" style={{ width: '100%', marginTop: '12px' }} disabled={Object.keys(give).length === 0 && Object.keys(request).length === 0} onClick={() => onAct('respond_trade', { status: 'counter', give, request })}>🔄 Send Counter-Offer</button>
            </div>
            <button className="btn btn-outline" style={{ marginTop: '8px' }} onClick={onClose}>Cancel (Decide Later)</button>
          </div>
        )}
      </div>
    </div>
  )
}
