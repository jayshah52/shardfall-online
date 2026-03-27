import { useState } from 'react'

const GEM_TYPES = ['ember', 'tide', 'verdant', 'storm', 'void']
const GEM_ICONS = { ember: '🔥', tide: '💧', verdant: '🌿', storm: '⚡', void: '🔮' }
const GEM_LABELS = { ember: 'Ember', tide: 'Tide', verdant: 'Verdant', storm: 'Storm', void: 'Void' }

export default function TradeModal({ player, tradeRate, onTrade, onClose }) {
  const [giveType, setGiveType] = useState(null)
  const [receiveType, setReceiveType] = useState(null)

  const canGive = (type) => (player?.gems?.[type] || 0) >= tradeRate
  const canConfirm = giveType && receiveType && giveType !== receiveType && canGive(giveType)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>🤝 Bank Trade ({tradeRate}:1)</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
          Give {tradeRate} gems of one type to receive 1 gem of another type.
        </p>

        <div className="trade-section">
          <label>Give {tradeRate}×:</label>
          <div className="trade-options">
            {GEM_TYPES.map(type => (
              <button
                key={type}
                className={`trade-option ${giveType === type ? 'selected' : ''}`}
                onClick={() => setGiveType(type)}
                disabled={!canGive(type)}
                style={giveType === type ? { borderColor: `var(--${type})` } : {}}
              >
                {GEM_ICONS[type]} {GEM_LABELS[type]} ({player?.gems?.[type] || 0})
              </button>
            ))}
          </div>
        </div>

        <div className="trade-section">
          <label>Receive 1×:</label>
          <div className="trade-options">
            {GEM_TYPES.filter(t => t !== giveType).map(type => (
              <button
                key={type}
                className={`trade-option ${receiveType === type ? 'selected' : ''}`}
                onClick={() => setReceiveType(type)}
                style={receiveType === type ? { borderColor: `var(--${type})` } : {}}
              >
                {GEM_ICONS[type]} {GEM_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-small btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-small btn-primary" disabled={!canConfirm} onClick={() => onTrade(giveType, receiveType)}>
            Confirm Trade
          </button>
        </div>
      </div>
    </div>
  )
}
