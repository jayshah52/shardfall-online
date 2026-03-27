import { useState, useEffect, useRef, useCallback } from 'react'
import { doAction, getRoomState } from '../api'
import Tutorial from './Tutorial'
import TradeModal from './TradeModal'
import ScoreModal from './ScoreModal'
import PlayerTradeModal from './PlayerTradeModal'
import Rulebook from './Rulebook'

const GEM_ICONS = { ember: '🔥', tide: '💧', verdant: '🌿', storm: '⚡', void: '🌐' }
const GEM_LABELS = { ember: 'Ember', tide: 'Tide', verdant: 'Verdant', storm: 'Storm', void: 'Void' }
const PORTAL_ICONS = { ember: '🌋', tide: '🌊', verdant: '🌲', storm: '⛈️', void: '🌐' }
const GEM_TYPES = ['ember', 'tide', 'verdant', 'storm', 'void']

export default function Game({ initialState, roomCode, playerId, myIndex, onLeave }) {
  const [state, setState] = useState(initialState)
  const [selectedAction, setSelectedAction] = useState(null)
  const [selectedGems, setSelectedGems] = useState([])
  const [discardSelection, setDiscardSelection] = useState({})
  const [showTrade, setShowTrade] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [showP2pTrade, setShowP2pTrade] = useState(false)
  const [convertFrom, setConvertFrom] = useState(null)
  const [convertTo, setConvertTo] = useState(null)
  const [showTutorial, setShowTutorial] = useState(true)
  const [showScore, setShowScore] = useState(true)
  const [latestAnomaly, setLatestAnomaly] = useState(null)
  const [turnPulse, setTurnPulse] = useState(false)
  const [error, setError] = useState(null)
  const [viewingPlayer, setViewingPlayer] = useState(myIndex)
  const [animatingPortals, setAnimatingPortals] = useState(new Set())
  const [showContracts, setShowContracts] = useState(false)
  const [showRulebook, setShowRulebook] = useState(false)
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
  const myTotalGems = myPlayer ? Object.values(myPlayer.gems || {}).reduce((a, b) => a + b, 0) : 0

  // Poll for game state when it's NOT my turn or trade is active
  useEffect(() => {
    if (isGameOver) return
    const shouldPoll = (!isMyTurn && !isMyDiscard) || state.active_trade
    if (!shouldPoll) return

    const interval = setInterval(async () => {
      try {
        const newState = await getRoomState(roomCode, playerId)
        setState(prev => {
          // Animate portal changes
          const changedPortals = new Set()
          newState.active_portals?.forEach(r => {
            const old = prev.active_portals?.find(o => o.id === r.id)
            if (old && old.stability !== r.stability) changedPortals.add(r.id)
          })
          if (changedPortals.size) {
            setAnimatingPortals(changedPortals)
            setTimeout(() => setAnimatingPortals(new Set()), 600)
          }

          if (newState.active_trade && (!prev.active_trade || prev.active_trade.initiator !== newState.active_trade.initiator)) {
            if (newState.active_trade.initiator !== myIndex) setShowP2pTrade(true)
          }

          return newState
        })
      } catch (e) { /* ignore polling errors */ }
    }, 2000)
    return () => clearInterval(interval)
  }, [isMyTurn, isGameOver, roomCode, playerId, isMyDiscard, state.active_trade])

  // Reset selections when turn changes
  useEffect(() => {
    setSelectedAction(null)
    setSelectedGems([])
    setDiscardSelection({})
    if (state.current_player === myIndex) {
      setViewingPlayer(myIndex)
    }
  }, [state.current_player, state.phase, myIndex])

  const act = useCallback(async (action, params = {}) => {
    setError(null)
    try {
      const newState = await doAction(roomCode, playerId, action, params)
      const changedPortals = new Set()
      newState.active_portals?.forEach(r => {
        const old = state.active_portals?.find(o => o.id === r.id)
        if (old && old.stability !== r.stability) changedPortals.add(r.id)
      })
      if (changedPortals.size) {
        setAnimatingPortals(changedPortals)
        setTimeout(() => setAnimatingPortals(new Set()), 600)
      }
      setState(newState)
      setSelectedAction(null)
      setSelectedGems([])
      setDiscardSelection({})
    } catch (e) {
      setError(e.message)
      setTimeout(() => setError(null), 4000)
    }
  }, [roomCode, playerId, state.active_portals])

  // Gather count
  const gatherCount = (() => {
    if (!myPlayer) return 1
    if (myPlayer.constructs?.some(c => c.ability === 'gather_bonus')) return 2
    return 1
  })()

  // Portal sensitivity
  const portalSensitivity = myPlayer ? Math.max(0, (myPlayer.constructs?.length || 0) - 2) : 0
  const extractDiscount = myPlayer?.constructs?.some(c => c.ability === 'extract_discount') ? 1 : 0

  // === COLLECT ===
  const handleMarketClick = (index) => {
    if (selectedAction !== 'collect' || !isMyTurn) return
    setSelectedGems(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index)
      if (prev.length >= Math.min(gatherCount, state.gem_market?.length || 0))
        return [...prev.slice(1), index]
      return [...prev, index]
    })
  }

  const confirmCollect = () => {
    if (selectedGems.length > 0) act('collect', { gem_indices: selectedGems })
  }

  // === HARVEST ===
  const handlePortalClick = (portalIndex, e) => {
    if (!isMyTurn) return
    if (selectedAction === 'harvest') {
      act('harvest', { portal_index: portalIndex, deep: !!e?.shiftKey })
    } else if (selectedAction === 'stabilize') {
      act('stabilize', { portal_index: portalIndex })
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
      const playerGems = myPlayer?.gems?.[type] || 0
      const totalSelected = Object.values(prev).reduce((a, b) => a + b, 0)
      if (cur < playerGems && totalSelected < state.discard_required) {
        return { ...prev, [type]: cur + 1 }
      }
      if (cur > 0) return { ...prev, [type]: cur - 1 }
      return prev
    })
  }

  const confirmDiscard = () => {
    const total = Object.values(discardSelection).reduce((a, b) => a + b, 0)
    if (total === state.discard_required) act('discard', { gems: discardSelection })
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
    return Object.entries(cost).every(([t, a]) => (myPlayer.gems?.[t] || 0) >= a)
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

  const getClaimInfo = (portal) => {
    const claim = state.portal_claims?.[String(portal.id)]
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
            <div className={`hand-limit-badge ${myTotalGems >= handLimit ? 'full' : ''}`}>
              ✋ {myTotalGems}/{handLimit}
            </div>
          )}
        </div>
        <div className="game-header-right">
          <button className="btn btn-small btn-outline" onClick={() => { if(window.confirm('Are you sure you want to leave the game?')) onLeave() }} title="Leave Room" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', marginRight: '8px' }}>🚪 Leave</button>
          <span className="room-code-badge" title="Room Code">🏠 {roomCode}</span>
          <div className="fracture-track" id="fracture-track">
            <span className="fracture-track-label">Fracture</span>
            <div className="fracture-track-bar">
              {Array.from({ length: state.fracture_threshold || 4 }, (_, i) => (
                <div key={i} className={`fracture-segment ${i < state.fracture ? 'filled' : ''} ${i < state.fracture && state.fracture >= (state.fracture_threshold || 4) - 2 ? 'high' : 'low'}`} />
              ))}
            </div>
            <span className="fracture-number" style={{ color: state.fracture >= (state.fracture_threshold || 4) - 2 ? 'var(--danger)' : 'var(--text-secondary)' }}>
              {state.fracture}/{state.fracture_threshold || 4}
            </span>
          </div>
          <button className="btn btn-small btn-outline" onClick={() => setShowRulebook(true)} title="Rulebook" style={{ marginRight: '8px' }}>📖</button>
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
              : `🌀 ${state.peek_deck[0].type?.charAt(0).toUpperCase() + state.peek_deck[0].type?.slice(1)} Portal`}
          </div>
        )}

        {/* Discard Mode */}
        {isMyDiscard && (
          <div className="discard-banner">
            <h3>⚠️ Hand Limit Exceeded! Discard {state.discard_required} gem(s)</h3>
            <p>Click gem types below to select which to discard</p>
            <div className="discard-selector">
              {GEM_TYPES.map(type => {
                const have = myPlayer?.gems?.[type] || 0
                const selecting = discardSelection[type] || 0
                return have > 0 ? (
                  <button key={type} className="discard-shard-btn" data-type={type}
                    onClick={() => toggleDiscard(type)}>
                    {GEM_ICONS[type]} {GEM_LABELS[type]}: {have} → {have - selecting}
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

        {/* Portal Zone */}
        <section id="portal-zone">
          <div className="section-label">
            🌀 Portal Zone ({state.active_portals?.length || 0} active, {state.portal_deck_remaining || 0} in deck)
            {selectedAction === 'harvest' && <span className="helper-text">— Click a portal (Shift = Deep). {portalSensitivity > 0 ? `⚠️ Sensitivity +${portalSensitivity}` : ''} 🔖 = toll</span>}
            {selectedAction === 'stabilize' && <span className="helper-text">— Click a damaged portal to stabilize</span>}
          </div>
          <div className="portal-zone">
            {state.active_portals.map((portal, i) => {
              const clickable = isMyTurn && (selectedAction === 'harvest' || (selectedAction === 'stabilize' && portal.stability < portal.max_stability))
              const claimer = getClaimInfo(portal)
              const safeCost = Math.max(0, 1 + portalSensitivity - extractDiscount)
              const deepCost = Math.max(0, 2 + portalSensitivity - extractDiscount)
              const canSafe = portal.stability >= safeCost
              const canDeep = portal.stability >= deepCost
              return (
                <div key={portal.id}
                  className={`portal-card ${clickable ? 'clickable' : ''} ${animatingPortals.has(portal.id) ? 'unstable' : ''} animate-pop-in`}
                  data-type={portal.type}
                  onClick={(e) => handlePortalClick(i, e)}
                  style={claimer ? { boxShadow: `0 0 12px ${claimer.color}33`, borderColor: `${claimer.color}88` } : {}}>
                  {claimer && (
                    <div className="claim-badge" style={{ background: claimer.color }}>
                      🔖 {claimer.name.split(' ')[0]}
                    </div>
                  )}
                  <div className="portal-type" style={{ color: `var(--${portal.type})` }}>{portal.type}</div>
                  <span className="portal-icon">{PORTAL_ICONS[portal.type]}</span>
                  <div className="stability-bar">
                    {Array.from({ length: portal.max_stability }, (_, j) => (
                      <div key={j} className={`stability-pip ${j < portal.stability ? (portal.stability === 1 ? 'danger' : 'full') : 'empty'}`} />
                    ))}
                  </div>
                  <div className="portal-stability-label">{portal.stability}/{portal.max_stability}</div>
                  {selectedAction === 'harvest' && isMyTurn && (
                    <div className="portal-harvest-info">
                      <span className={canSafe ? '' : 'blocked'}>Safe: −{safeCost}{!canSafe && ' ❌'}</span>
                      <span className={canDeep ? '' : 'blocked'}>Deep: −{deepCost}{!canDeep && ' ❌'}</span>
                    </div>
                  )}
                </div>
              )
            })}
            {state.active_portals.length === 0 && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No active portals</p>}
          </div>
        </section>

        {/* Gem Market */}
        <section id="gem-market-section">
          <div className="section-label">
            💎 Gem Market
            {selectedAction === 'collect' && <span className="helper-text">— Select {Math.min(gatherCount, state.gem_market?.length || 0)} gem(s), then confirm</span>}
          </div>
          <div className="shard-market">
            {(state.gem_market || []).map((gem, i) => (
              <button key={i}
                className={`shard-token ${selectedAction === 'collect' && isMyTurn ? 'clickable' : ''} ${selectedGems.includes(i) ? 'selected' : ''}`}
                data-type={gem} onClick={() => handleMarketClick(i)} title={GEM_LABELS[gem]}
                disabled={selectedAction !== 'collect' || !isMyTurn}>
                {GEM_ICONS[gem]}
              </button>
            ))}
            {selectedAction === 'collect' && selectedGems.length > 0 && (
              <button className="btn btn-small btn-success" onClick={confirmCollect}>
                ✓ Collect {selectedGems.length}
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
                          {GEM_ICONS[type]}
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
          {viewedPlayer && (() => {
            let guardianMult = 1;
            let explorerMult = 1;
            let constructsVp = 0;
            viewedPlayer.constructs?.forEach(c => {
              constructsVp += c.vp;
              if (c.ability === 'double_guardian_vp') guardianMult = 2;
              if (c.ability === 'double_explorer_vp') explorerMult = 2;
            });
            const visVp = constructsVp + (viewedPlayer.guardian_tokens || 0) * guardianMult + (viewedPlayer.explorer_tokens || 0) * explorerMult;

            return (
            <div className="player-info">
              <div className="player-name-row" style={{ fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: viewedPlayer.color, display: 'inline-block', boxShadow: `0 0 10px ${viewedPlayer.color}` }} />
                  {viewedPlayer.name}
                  {viewedPlayer.index === myIndex && <span className="lobby-you-badge" style={{ marginLeft: 8 }}>YOU</span>}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', background: 'rgba(255,167,38,0.2)', color: 'var(--warning)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(255,167,38,0.4)' }}>
                  {visVp} VP
                </div>
              </div>
              
              {viewedPlayer.seeker && (
                <div className="active-power-card" style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px', boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1.4rem' }}>{viewedPlayer.seeker.icon}</span>
                    <span style={{ fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--accent)' }}>{viewedPlayer.seeker.name}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: '1.3' }}>
                    "{viewedPlayer.seeker.description || viewedPlayer.seeker.ability}"
                  </div>
                </div>
              )}
              <div className="shards-display">
                {GEM_TYPES.map(type => (
                   <div key={type} className="shard-count" data-type={type}>
                    {GEM_ICONS[type]} {viewedPlayer.gems?.[type] || 0}
                  </div>
                ))}
              </div>
              <div className="token-row">
                <div className="token-item">🛡️ <span className="token-value">{viewedPlayer.guardian_tokens}</span> {guardianMult > 1 && <span style={{color:'var(--warning)', fontSize:'0.7rem'}}>(x{guardianMult})</span>} Guardian</div>
                <div className="token-item">🧭 <span className="token-value">{viewedPlayer.explorer_tokens}</span> {explorerMult > 1 && <span style={{color:'var(--warning)', fontSize:'0.7rem'}}>(x{explorerMult})</span>} Explorer</div>
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
                  <div className="built-constructs" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {viewedPlayer.constructs.map((c, i) => (
                      <div key={i} className="built-item" style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.name} <span className={`mini-tier ${c.tier}`}>{c.tier[0].toUpperCase()}</span></span>
                          <span className="built-vp" style={{ color: 'var(--warning)', fontWeight: 'bold' }}>+{c.vp} VP</span>
                        </div>
                        {c.ability_desc && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: '4px', fontStyle: 'italic' }}>
                            {c.ability_desc}
                          </div>
                        )}
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
          )})()}
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
            { key: 'collect', icon: '💎', label: 'Collect' },
            { key: 'harvest', icon: '⛏️', label: 'Harvest' },
            { key: 'build', icon: '🏗️', label: 'Build' },
            { key: 'stabilize', icon: '🛡️', label: 'Stabilize' },
            { key: 'trade_bank', icon: '🤝', label: 'Trade' },
          ].map(({ key, icon, label }) => (
            <button key={key}
              className={`action-btn ${selectedAction === key ? 'active' : ''}`}
              disabled={!isActionAvailable(key)}
              onClick={() => {
                if (key === 'trade_bank') { setSelectedAction('trade_bank'); setShowTrade(true) }
                else { setSelectedAction(selectedAction === key ? null : key); setSelectedGems([]) }
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

          {isMyTurn && !state.active_trade && (
            <button className={`action-btn free-action ${showP2pTrade ? 'active' : ''}`}
              onClick={() => setShowP2pTrade(!showP2pTrade)}>
              <span className="action-icon">🤝</span> P2P Trade <span className="free-badge">FREE</span>
            </button>
          )}
        </div>
      )}

      {/* Persistent Banner for Active Trades */}
      {state.active_trade && !showP2pTrade && (
        <div className="active-trade-banner animate-slide-up" style={{
          position: 'fixed', bottom: 120, left: '50%', transform: 'translateX(-50%)', zIndex: 90,
          background: 'var(--warning)', color: '#000', padding: '12px 24px', borderRadius: '30px',
          boxShadow: '0 8px 30px rgba(243, 156, 18, 0.4)', fontWeight: 'bold', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px'
        }} onClick={() => setShowP2pTrade(true)}>
          📢 {state.active_trade.initiator === myIndex ? 'Manage your active Trade Offer' : `Respond to Trade Offer from ${state.active_trade.initiator_name}`} ➔
        </div>
      )}

      {/* === MODALS === */}
      {showP2pTrade && (
        <PlayerTradeModal state={state} myPlayer={myPlayer}
          onAct={(action, params) => { act(action, params); if (action === 'trade_player_offer' || action === 'trade_player_cancel' || action === 'trade_player_confirm') setShowP2pTrade(false) }}
          onClose={() => setShowP2pTrade(false)} />
      )}

      {showTrade && (
        <TradeModal player={myPlayer}
          tradeRate={myPlayer?.seeker?.power === 'trade_discount' || myPlayer?.constructs?.some(c => c.ability === 'trade_discount') ? 2 : 3}
          onTrade={(give, receive) => { act('trade_bank', { give_type: give, receive_type: receive }); setShowTrade(false); setSelectedAction(null) }}
          onClose={() => { setShowTrade(false); setSelectedAction(null) }} />
      )}

      {showConvert && (
        <div className="modal-overlay" onClick={() => setShowConvert(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🔧 Gem Forge — Convert (Free Action)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>Convert 1 gem to any other type. Does not cost an action.</p>
            <div className="trade-section">
              <label>Convert from:</label>
              <div className="trade-options">
                {GEM_TYPES.map(t => (
                  <button key={t} className={`trade-option ${convertFrom === t ? 'selected' : ''}`}
                    onClick={() => setConvertFrom(t)} disabled={(myPlayer?.gems?.[t] || 0) < 1}>
                    {GEM_ICONS[t]} {GEM_LABELS[t]} ({myPlayer?.gems?.[t] || 0})
                  </button>
                ))}
              </div>
            </div>
            <div className="trade-section">
              <label>Convert to:</label>
              <div className="trade-options">
                {GEM_TYPES.filter(t => t !== convertFrom).map(t => (
                  <button key={t} className={`trade-option ${convertTo === t ? 'selected' : ''}`}
                    onClick={() => setConvertTo(t)}>
                    {GEM_ICONS[t]} {GEM_LABELS[t]}
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

      {isGameOver && showScore && <ScoreModal state={state} onNewGame={onLeave} onClose={() => setShowScore(false)} />}
      {!isGameOver && !showScore && <div className="game-over-badge" onClick={() => setShowScore(true)}>🏆 View Results</div>}
      {showTutorial && !isGameOver && <Tutorial onClose={() => setShowTutorial(false)} />}
      {showRulebook && <Rulebook onClose={() => setShowRulebook(false)} />}
      
      {/* Anomaly Animation Overlay */}
      {latestAnomaly && (
        <div className="anomaly-overlay animate-fade-in">
          <div className="anomaly-content animate-pop-in">
            <div className="anomaly-title">⚡ ANOMALY DETECTED</div>
            <div className="anomaly-name">{latestAnomaly.name}</div>
            <div className="anomaly-desc">{latestAnomaly.description}</div>
            <div className="anomaly-timer" />
          </div>
        </div>
      )}

      {/* Turn Notification */}
      {turnPulse && isMyTurn && (
        <div className="turn-notification animate-slide-up">
          🎯 YOUR TURN
        </div>
      )}
    </div>
  )
}
