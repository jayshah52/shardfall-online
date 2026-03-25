import { useState, useEffect, useRef, useCallback } from 'react'
import { doAction, getRoomState } from '../api'
import Tutorial from './Tutorial'
import TradeModal from './TradeModal'
import ScoreModal from './ScoreModal'

const SHARD_ICONS = { ember: '🔴', tide: '🔵', verdant: '🟢', storm: '🟡', void: '🟣' }
const SHARD_LABELS = { ember: 'Ember', tide: 'Tide', verdant: 'Verdant', storm: 'Storm', void: 'Void' }
const RIFT_ICONS = { ember: '🌋', tide: '🌊', verdant: '🌲', storm: '⛈️', void: '💎' }
const SHARD_TYPES = ['ember', 'tide', 'verdant', 'storm', 'void']

export default function Game({ initialState, roomCode, playerId, myIndex, onLeave }) {
  const [state, setState] = useState(initialState)
  const [selectedAction, setSelectedAction] = useState(null)
  const [selectedShards, setSelectedShards] = useState([])
  const [discardSelection, setDiscardSelection] = useState({})
  const [showTrade, setShowTrade] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [convertFrom, setConvertFrom] = useState(null)
  const [convertTo, setConvertTo] = useState(null)
  const [showTutorial, setShowTutorial] = useState(true)
  const [error, setError] = useState(null)
  const [viewingPlayer, setViewingPlayer] = useState(myIndex)
  const [animatingRifts, setAnimatingRifts] = useState(new Set())
  const [showContracts, setShowContracts] = useState(false)
  const logRef = useRef(null)

  const isMyTurn = state.current_player === myIndex
  const currentPlayer = state.players[state.current_player]
  const myPlayer = state.players[myIndex]
  const viewedPlayer = state.players[viewingPlayer]
  const isPlaying = state.phase === 'playing'
  const isDiscard = state.phase === 'discard'
  const isGameOver = state.phase === 'game_over'
  const isMyDiscard = isDiscard && isMyTurn

  const handLimit = myPlayer?.seeker?.power === 'hand_limit_up' ? 12 : (state.hand_limit || 10)
  const myTotalShards = myPlayer ? Object.values(myPlayer.shards).reduce((a, b) => a + b, 0) : 0

  // Poll for game state when it's NOT my turn
  useEffect(() => {
    if (isMyTurn && !isGameOver) return // Don't poll when it's my turn
    if (isGameOver) return

    const interval = setInterval(async () => {
      try {
        const newState = await getRoomState(roomCode, playerId)
        setState(prev => {
          // Animate rift changes
          const changedRifts = new Set()
          newState.active_rifts?.forEach(r => {
            const old = prev.active_rifts?.find(o => o.id === r.id)
            if (old && old.stability !== r.stability) changedRifts.add(r.id)
          })
          if (changedRifts.size) {
            setAnimatingRifts(changedRifts)
            setTimeout(() => setAnimatingRifts(new Set()), 600)
          }
          return newState
        })
      } catch (e) { /* ignore polling errors */ }
    }, 2000)
    return () => clearInterval(interval)
  }, [isMyTurn, isGameOver, roomCode, playerId])

  // Reset selections when turn changes
  useEffect(() => {
    setSelectedAction(null)
    setSelectedShards([])
    setDiscardSelection({})
    if (state.current_player === myIndex) {
      setViewingPlayer(myIndex)
    }
  }, [state.current_player, state.phase, myIndex])

  const act = useCallback(async (action, params = {}) => {
    setError(null)
    try {
      const newState = await doAction(roomCode, playerId, action, params)
      const changedRifts = new Set()
      newState.active_rifts?.forEach(r => {
        const old = state.active_rifts?.find(o => o.id === r.id)
        if (old && old.stability !== r.stability) changedRifts.add(r.id)
      })
      if (changedRifts.size) {
        setAnimatingRifts(changedRifts)
        setTimeout(() => setAnimatingRifts(new Set()), 600)
      }
      setState(newState)
      setSelectedAction(null)
      setSelectedShards([])
      setDiscardSelection({})
    } catch (e) {
      setError(e.message)
      setTimeout(() => setError(null), 4000)
    }
  }, [roomCode, playerId, state.active_rifts])

  // Gather count
  const gatherCount = (() => {
    if (!myPlayer) return 1
    if (myPlayer.constructs?.some(c => c.ability === 'gather_bonus')) return 2
    return 1
  })()

  // Rift sensitivity
  const riftSensitivity = myPlayer ? Math.max(0, (myPlayer.constructs?.length || 0) - 2) : 0
  const extractDiscount = myPlayer?.constructs?.some(c => c.ability === 'extract_discount') ? 1 : 0

  // === GATHER ===
  const handleMarketClick = (index) => {
    if (selectedAction !== 'gather' || !isMyTurn) return
    setSelectedShards(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index)
      if (prev.length >= Math.min(gatherCount, state.shard_market.length))
        return [...prev.slice(1), index]
      return [...prev, index]
    })
  }

  const confirmGather = () => {
    if (selectedShards.length > 0) act('gather', { shard_indices: selectedShards })
  }

  // === EXTRACT ===
  const handleRiftClick = (riftIndex, e) => {
    if (!isMyTurn) return
    if (selectedAction === 'extract') {
      act('extract', { rift_index: riftIndex, deep: !!e?.shiftKey })
    } else if (selectedAction === 'stabilize') {
      act('stabilize', { rift_index: riftIndex })
    }
  }

  // === BUILD ===
  const handleConstructClick = (index) => {
    if (selectedAction === 'build' && isMyTurn) act('build', { construct_index: index })
  }

  // === DISCARD ===
  const toggleDiscard = (type) => {
    setDiscardSelection(prev => {
      const cur = prev[type] || 0
      const playerShards = myPlayer?.shards?.[type] || 0
      const totalSelected = Object.values(prev).reduce((a, b) => a + b, 0)
      if (cur < playerShards && totalSelected < state.discard_required) {
        return { ...prev, [type]: cur + 1 }
      }
      if (cur > 0) return { ...prev, [type]: cur - 1 }
      return prev
    })
  }

  const confirmDiscard = () => {
    const total = Object.values(discardSelection).reduce((a, b) => a + b, 0)
    if (total === state.discard_required) act('discard', { shards: discardSelection })
  }

  const canAfford = (construct) => {
    if (!myPlayer || !isMyTurn) return false
    if (!canBuildTier(construct.tier)) return false
    const cost = { ...construct.cost }
    if (myPlayer.seeker?.power === 'build_discount' && Object.keys(cost).length > 0) {
      const cheapest = Object.keys(cost).reduce((a, b) => cost[a] <= cost[b] ? a : b)
      cost[cheapest] = Math.max(0, cost[cheapest] - 1)
      if (cost[cheapest] === 0) delete cost[cheapest]
    }
    return Object.entries(cost).every(([t, a]) => (myPlayer.shards[t] || 0) >= a)
  }

  const canBuildTier = (tier) => {
    if (!myPlayer) return false
    const smallCount = myPlayer.constructs?.filter(c => c.tier === 'small').length || 0
    const mediumCount = myPlayer.constructs?.filter(c => c.tier === 'medium').length || 0
    if (tier === 'small') return true
    if (tier === 'medium') return smallCount >= 2
    if (tier === 'large') return smallCount >= 2 && mediumCount >= 1
    return false
  }

  const isActionAvailable = (name) => isMyTurn && state.available_actions?.some(a => a.action === name)

  const getClaimInfo = (rift) => {
    const claim = state.rift_claims?.[String(rift.id)]
    if (!claim) return null
    return state.players[claim.player]
  }

  return (
    <div className="game-layout">
      {/* === HEADER === */}
      <header className="game-header">
        <div className="game-header-left">
          <span className="game-title">SHARDFALL</span>
          <span className="round-badge">Round {state.round}</span>
          {(isPlaying || isDiscard) && (
            <div className="turn-indicator" style={{ background: `${currentPlayer.color}22`, border: `1px solid ${currentPlayer.color}44` }}>
              <span style={{ color: currentPlayer.color }}>
                {isMyTurn ? "🎯 Your Turn" : `${currentPlayer.name}'s Turn`}
              </span>
              <span className="actions-badge">
                {isMyDiscard ? `⚠️ Discard ${state.discard_required}` :
                  isMyTurn ? `${state.actions_remaining} action${state.actions_remaining !== 1 ? 's' : ''}` :
                  'Waiting...'}
              </span>
            </div>
          )}
          {(isPlaying || isDiscard) && (
            <div className={`hand-limit-badge ${myTotalShards >= handLimit ? 'full' : ''}`}>
              ✋ {myTotalShards}/{handLimit}
            </div>
          )}
        </div>
        <div className="game-header-right">
          <span className="room-code-badge" title="Room Code">🏠 {roomCode}</span>
          <div className="fracture-track" id="fracture-track">
            <span className="fracture-track-label">Fracture</span>
            <div className="fracture-track-bar">
              {Array.from({ length: state.fracture_threshold }, (_, i) => (
                <div key={i} className={`fracture-segment ${i < state.fracture ? 'filled' : ''} ${i < state.fracture && state.fracture >= state.fracture_threshold - 2 ? 'high' : 'low'}`} />
              ))}
            </div>
            <span className="fracture-number" style={{ color: state.fracture >= state.fracture_threshold - 2 ? 'var(--danger)' : 'var(--text-secondary)' }}>
              {state.fracture}/{state.fracture_threshold}
            </span>
          </div>
          <button className="btn btn-small btn-outline" onClick={() => setShowTutorial(true)} title="Tutorial">❓</button>
        </div>
      </header>

      {/* === MAIN BOARD === */}
      <main className="game-board">
        {error && <div className="error-banner animate-pop-in">⚠️ {error}</div>}

        {/* Not your turn overlay */}
        {!isMyTurn && !isGameOver && (isPlaying || isDiscard) && (
          <div className="waiting-banner animate-slide-up">
            ⏳ Waiting for <strong style={{ color: currentPlayer?.color }}>{currentPlayer?.name}</strong> to finish their turn...
          </div>
        )}

        {/* Peek Deck (Scout Tower) */}
        {state.peek_deck && state.peek_deck.length > 0 && isMyTurn && (
          <div className="peek-banner animate-slide-up">
            🔭 Scout Tower: Next card is {state.peek_deck[0].type === 'anomaly'
              ? `⚡ Anomaly: ${state.peek_deck[0].name}`
              : `🌀 ${state.peek_deck[0].rift_type?.charAt(0).toUpperCase() + state.peek_deck[0].rift_type?.slice(1)} Rift`}
          </div>
        )}

        {/* Discard Mode */}
        {isMyDiscard && (
          <div className="discard-banner">
            <h3>⚠️ Hand Limit Exceeded! Discard {state.discard_required} shard(s)</h3>
            <p>Click shard types below to select which to discard</p>
            <div className="discard-selector">
              {SHARD_TYPES.map(type => {
                const have = myPlayer?.shards?.[type] || 0
                const selecting = discardSelection[type] || 0
                return have > 0 ? (
                  <button key={type} className="discard-shard-btn" data-type={type}
                    onClick={() => toggleDiscard(type)}>
                    {SHARD_ICONS[type]} {SHARD_LABELS[type]}: {have} → {have - selecting}
                    {selecting > 0 && <span className="discard-count">−{selecting}</span>}
                  </button>
                ) : null
              })}
            </div>
            <button className="btn btn-small btn-danger" onClick={confirmDiscard}
              disabled={Object.values(discardSelection).reduce((a, b) => a + b, 0) !== state.discard_required}>
              🗑️ Discard {Object.values(discardSelection).reduce((a, b) => a + b, 0)}/{state.discard_required}
            </button>
          </div>
        )}

        {/* Rift Zone */}
        <section id="rift-zone">
          <div className="section-label">
            🌀 Rift Zone ({state.active_rifts.length} active, {state.rift_deck_remaining} in deck)
            {selectedAction === 'extract' && <span className="helper-text">— Click a rift (Shift = Deep). {riftSensitivity > 0 ? `⚠️ Sensitivity +${riftSensitivity}` : ''} 🔖 = toll</span>}
            {selectedAction === 'stabilize' && <span className="helper-text">— Click a damaged rift to stabilize</span>}
          </div>
          <div className="rift-zone">
            {state.active_rifts.map((rift, i) => {
              const clickable = isMyTurn && (selectedAction === 'extract' || (selectedAction === 'stabilize' && rift.stability < rift.max_stability))
              const claimer = getClaimInfo(rift)
              const safeCost = Math.max(0, 1 + riftSensitivity - extractDiscount)
              const deepCost = Math.max(0, 2 + riftSensitivity - extractDiscount)
              const canSafe = rift.stability >= safeCost
              const canDeep = rift.stability >= deepCost
              return (
                <div key={rift.id}
                  className={`rift-card ${clickable ? 'clickable' : ''} ${animatingRifts.has(rift.id) ? 'unstable' : ''} animate-pop-in`}
                  data-type={rift.type}
                  onClick={(e) => clickable && handleRiftClick(i, e)}
                  style={claimer ? { boxShadow: `0 0 12px ${claimer.color}33`, borderColor: `${claimer.color}88` } : {}}>
                  {claimer && (
                    <div className="claim-badge" style={{ background: claimer.color }}>
                      🔖 {claimer.name.split(' ')[0]}
                    </div>
                  )}
                  <div className="rift-type" style={{ color: `var(--${rift.type})` }}>{rift.type}</div>
                  <span className="rift-icon">{RIFT_ICONS[rift.type]}</span>
                  <div className="stability-bar">
                    {Array.from({ length: rift.max_stability }, (_, j) => (
                      <div key={j} className={`stability-pip ${j < rift.stability ? (rift.stability === 1 ? 'danger' : 'full') : 'empty'}`} />
                    ))}
                  </div>
                  <div className="rift-stability-label">{rift.stability}/{rift.max_stability}</div>
                  {selectedAction === 'extract' && isMyTurn && (
                    <div className="rift-extract-info">
                      <span className={canSafe ? '' : 'blocked'}>Safe: −{safeCost}{!canSafe && ' ❌'}</span>
                      <span className={canDeep ? '' : 'blocked'}>Deep: −{deepCost}{!canDeep && ' ❌'}</span>
                    </div>
                  )}
                </div>
              )
            })}
            {state.active_rifts.length === 0 && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No active rifts</p>}
          </div>
        </section>

        {/* Shard Market */}
        <section id="shard-market">
          <div className="section-label">
            💎 Shard Market
            {selectedAction === 'gather' && <span className="helper-text">— Select {Math.min(gatherCount, state.shard_market.length)} shard(s), then confirm</span>}
          </div>
          <div className="shard-market">
            {state.shard_market.map((shard, i) => (
              <div key={i}
                className={`shard-token ${selectedAction === 'gather' && isMyTurn ? 'clickable' : ''} ${selectedShards.includes(i) ? 'selected' : ''}`}
                data-type={shard} onClick={() => handleMarketClick(i)} title={SHARD_LABELS[shard]}>
                {SHARD_ICONS[shard]}
              </div>
            ))}
            {selectedAction === 'gather' && selectedShards.length > 0 && (
              <button className="btn btn-small btn-success" onClick={confirmGather}>
                ✓ Take {selectedShards.length}
              </button>
            )}
          </div>
        </section>

        {/* Construct Display */}
        <section id="construct-display">
          <div className="section-label">
            🏗️ Constructs — Build {state.constructs_end_count || 7} to win
            {selectedAction === 'build' && <span className="helper-text">— Click an affordable construct. 2S → M, 2S+1M → L</span>}
          </div>
          <div className="construct-display">
            {state.construct_display.map((c, i) => {
              const affordable = (isPlaying && isMyTurn && (selectedAction === 'build' || !selectedAction) && canAfford(c))
              const tierLocked = !canBuildTier(c.tier)
              return (
                <div key={c.id}
                  className={`construct-card animate-slide-up ${affordable ? 'affordable' : ''} ${tierLocked ? 'tier-locked' : ''}`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                  onClick={() => affordable && selectedAction === 'build' && handleConstructClick(i)}>
                  <span className={`tier-badge ${c.tier}`}>{c.tier}</span>
                  {tierLocked && <div className="tier-lock-overlay">🔒</div>}
                  <div className="construct-name">{c.name}</div>
                  <div className="construct-vp">{c.vp} <span>VP</span></div>
                  <div className="construct-cost">
                    {Object.entries(c.cost).map(([type, amount]) =>
                      Array.from({ length: amount }, (_, j) => (
                        <div key={`${type}-${j}`} className="cost-pip" style={{ background: `var(--${type}-glow)`, border: `1px solid var(--${type})` }}>
                          {SHARD_ICONS[type]}
                        </div>
                      ))
                    )}
                  </div>
                  {c.ability_desc && <div className="construct-ability">✨ {c.ability_desc}</div>}
                </div>
              )
            })}
          </div>
        </section>
      </main>

      {/* === SIDEBAR === */}
      <aside className="game-sidebar">
        <div className="player-panel" id="player-panel">
          <div className="player-tabs">
            {state.players.map((p, i) => (
              <button key={i}
                className={`player-tab ${viewingPlayer === i ? 'active' : ''} ${state.current_player === i && (isPlaying || isDiscard) ? 'current' : ''}`}
                onClick={() => setViewingPlayer(i)}
                style={viewingPlayer === i ? { borderBottom: `2px solid ${p.color}` } : {}}>
                {i === myIndex ? '★' : ''} {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
          {viewedPlayer && (
            <div className="player-info">
              <div className="player-name-row">
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: viewedPlayer.color, display: 'inline-block' }} />
                {viewedPlayer.name}
                {viewedPlayer.index === myIndex && <span className="lobby-you-badge" style={{ marginLeft: 6 }}>YOU</span>}
                {viewedPlayer.seeker && <span className="seeker-badge">{viewedPlayer.seeker.icon} {viewedPlayer.seeker.name}</span>}
              </div>
              <div className="shards-display">
                {SHARD_TYPES.map(type => (
                  <div key={type} className="shard-count" data-type={type}>
                    {SHARD_ICONS[type]} {viewedPlayer.shards[type]}
                  </div>
                ))}
              </div>
              <div className="token-row">
                <div className="token-item">🛡️ <span className="token-value">{viewedPlayer.guardian_tokens}</span> Guardian</div>
                <div className="token-item">🧭 <span className="token-value">{viewedPlayer.explorer_tokens}</span> Explorer ({viewedPlayer.explored_types?.length || 0}/5)</div>
              </div>
              <div className="token-row">
                <div className="token-item">🔖 <span className="token-value">{viewedPlayer.tolls_collected}</span> Tolls</div>
                <div className="token-item">🤝 <span className="token-value">{viewedPlayer.trades_completed}</span> Trades</div>
              </div>
              {viewedPlayer.constructs.length > 0 && (
                <div className="built-section">
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Built: {viewedPlayer.constructs.filter(c => c.tier === 'small').length}S / {viewedPlayer.constructs.filter(c => c.tier === 'medium').length}M / {viewedPlayer.constructs.filter(c => c.tier === 'large').length}L
                    — {viewedPlayer.constructs.length}/{state.constructs_end_count || 7}
                  </div>
                  <div className="built-constructs">
                    {viewedPlayer.constructs.map((c, i) => (
                      <div key={i} className="built-item">
                        <span>{c.name} <span className={`mini-tier ${c.tier}`}>{c.tier[0].toUpperCase()}</span></span>
                        <span className="built-vp">+{c.vp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewedPlayer.milestones && viewedPlayer.milestones.length > 0 && (
                <div className="milestones-section">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', marginTop: '8px' }}>🏆 Achievements</div>
                  <div className="milestones-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {viewedPlayer.milestones.map(m => (
                      <span key={m} className="milestone-badge" style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255, 215, 0, 0.1)', color: 'var(--warning)', borderRadius: '4px', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                        {m.replace('_', ' ').toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Contracts — only visible for yourself */}
              {viewedPlayer.index === myIndex && viewedPlayer.contracts?.length > 0 && (
                <div className="contracts-section">
                  <button className="btn btn-small btn-outline" style={{ width: '100%', marginTop: '8px' }}
                    onClick={() => setShowContracts(!showContracts)}>
                    📜 {showContracts ? 'Hide' : 'Show'} Contracts ({viewedPlayer.contracts.length})
                  </button>
                  {showContracts && (
                    <div className="contract-cards">
                      {viewedPlayer.contracts.map((c, i) => (
                        <div key={i} className="contract-card">
                          <span>{c.icon} {c.name}</span>
                          <span className="contract-vp">+{c.vp}</span>
                          <div className="contract-req">{c.requirement}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="activity-log" id="activity-log">
          <div className="activity-log-header">📋 Activity Log</div>
          <div className="activity-log-entries" ref={logRef}>
            {[...(state.activity_log || [])].reverse().map((entry, i) => {
              const playerInfo = entry.player != null ? state.players[entry.player] : null
              return (
                <div key={i} className={`log-entry ${entry.type} ${i === 0 ? 'latest' : ''}`}>
                  {entry.round > 0 && <span className="log-round">R{entry.round}</span>}
                  {playerInfo && (
                    <span className="log-player-dot" style={{ background: playerInfo.color }} title={playerInfo.name} />
                  )}
                  <span className="log-message">{entry.message}</span>
                </div>
              )
            })}
          </div>
        </div>
      </aside>

      {/* === ACTION BAR (only on your turn) === */}
      {isMyTurn && isPlaying && (
        <div className="action-bar" id="action-bar">
          {[
            { key: 'gather', icon: '💎', label: 'Gather' },
            { key: 'extract', icon: '⛏️', label: 'Extract' },
            { key: 'build', icon: '🏗️', label: 'Build' },
            { key: 'stabilize', icon: '🛡️', label: 'Stabilize' },
            { key: 'trade_bank', icon: '🤝', label: 'Trade' },
          ].map(({ key, icon, label }) => (
            <button key={key}
              className={`action-btn ${selectedAction === key ? 'active' : ''}`}
              disabled={!isActionAvailable(key)}
              onClick={() => {
                if (key === 'trade_bank') { setSelectedAction('trade_bank'); setShowTrade(true) }
                else { setSelectedAction(selectedAction === key ? null : key); setSelectedShards([]) }
              }}>
              <span className="action-icon">{icon}</span> {label}
              <span className="helper-tooltip">
                {state.available_actions?.find(a => a.action === key)?.helper || ''}
              </span>
            </button>
          ))}
          {isActionAvailable('convert') && (
            <button className={`action-btn free-action ${showConvert ? 'active' : ''}`}
              onClick={() => setShowConvert(!showConvert)}>
              <span className="action-icon">🔧</span> Convert <span className="free-badge">FREE</span>
            </button>
          )}
        </div>
      )}

      {/* === MODALS === */}
      {showTrade && (
        <TradeModal player={myPlayer}
          tradeRate={myPlayer?.seeker?.power === 'trade_discount' || myPlayer?.constructs?.some(c => c.ability === 'trade_discount') ? 2 : 3}
          onTrade={(give, receive) => { act('trade_bank', { give_type: give, receive_type: receive }); setShowTrade(false); setSelectedAction(null) }}
          onClose={() => { setShowTrade(false); setSelectedAction(null) }} />
      )}

      {showConvert && (
        <div className="modal-overlay" onClick={() => setShowConvert(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🔧 Shard Forge — Convert (Free Action)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>Convert 1 shard to any other type. Does not cost an action.</p>
            <div className="trade-section">
              <label>Convert from:</label>
              <div className="trade-options">
                {SHARD_TYPES.map(t => (
                  <button key={t} className={`trade-option ${convertFrom === t ? 'selected' : ''}`}
                    onClick={() => setConvertFrom(t)} disabled={(myPlayer?.shards?.[t] || 0) < 1}>
                    {SHARD_ICONS[t]} {SHARD_LABELS[t]} ({myPlayer?.shards?.[t] || 0})
                  </button>
                ))}
              </div>
            </div>
            <div className="trade-section">
              <label>Convert to:</label>
              <div className="trade-options">
                {SHARD_TYPES.filter(t => t !== convertFrom).map(t => (
                  <button key={t} className={`trade-option ${convertTo === t ? 'selected' : ''}`}
                    onClick={() => setConvertTo(t)}>
                    {SHARD_ICONS[t]} {SHARD_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-small btn-outline" onClick={() => setShowConvert(false)}>Cancel</button>
              <button className="btn btn-small btn-primary" disabled={!convertFrom || !convertTo}
                onClick={() => { act('convert', { from_type: convertFrom, to_type: convertTo }); setShowConvert(false); setConvertFrom(null); setConvertTo(null) }}>
                Convert
              </button>
            </div>
          </div>
        </div>
      )}

      {isGameOver && <ScoreModal state={state} onNewGame={onLeave} />}
      {showTutorial && !isGameOver && <Tutorial onClose={() => setShowTutorial(false)} />}
    </div>
  )
}
