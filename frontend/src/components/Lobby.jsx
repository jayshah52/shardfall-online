import { useState, useEffect, useCallback } from 'react'
import { getRoomState, startGame } from '../api'

const PLAYER_COLORS = ['#e74c3c', '#3498db', '#27ae60', '#f39c12', '#9b59b6']

export default function Lobby({ roomCode, playerId, initialState, onGameStart }) {
  const [state, setState] = useState(initialState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const isHost = state.room_players?.some(p => p.is_you && p.is_host)
  const joinedCount = state.room_players?.length || 0
  const needed = state.player_count || 0
  const isFull = joinedCount >= needed

  // Poll for new players
  useEffect(() => {
    if (state.room_status === 'playing') {
      onGameStart(state)
      return
    }
    const interval = setInterval(async () => {
      try {
        const newState = await getRoomState(roomCode, playerId)
        setState(newState)
        if (newState.room_status === 'playing' || newState.phase) {
          onGameStart(newState)
        }
      } catch (e) { /* ignore polling errors */ }
    }, 2000)
    return () => clearInterval(interval)
  }, [roomCode, playerId, state.room_status, onGameStart])

  const handleStart = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const newState = await startGame(roomCode, playerId)
      setState(newState)
      onGameStart(newState)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [roomCode, playerId, onGameStart])

  const shareUrl = `${window.location.origin}?room=${roomCode}`

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="landing">
      <h1 className="landing-title">SHARDFALL</h1>
      <p className="landing-subtitle">Waiting Room</p>

      <div className="landing-form lobby-form">
        <div className="lobby-code-section">
          <div className="lobby-code-label">Room Code</div>
          <div className="lobby-code" onClick={copyCode} title="Click to copy">
            {roomCode.split('').map((ch, i) => (
              <span key={i} className="lobby-code-char">{ch}</span>
            ))}
          </div>
          <div className="lobby-share-actions">
            <button className="btn btn-small btn-outline" onClick={copyCode}>
              {copied ? '✅ Copied!' : '📋 Copy Code'}
            </button>
            <button className="btn btn-small btn-outline" onClick={copyLink}>
              🔗 Copy Link
            </button>
          </div>
          <p className="lobby-share-hint">Share this code or link with your friends to join</p>
        </div>

        <div className="lobby-players">
          <div className="lobby-players-header">
            Players ({joinedCount}/{needed})
          </div>
          {Array.from({ length: needed }, (_, i) => {
            const player = state.room_players?.[i]
            return (
              <div key={i} className={`lobby-player-slot ${player ? 'filled' : 'empty'}`}>
                {player ? (
                  <>
                    <span className="lobby-player-dot" style={{ background: PLAYER_COLORS[i] }} />
                    <span className="lobby-player-name">{player.name}</span>
                    {player.is_host && <span className="lobby-host-badge">HOST</span>}
                    {player.is_you && <span className="lobby-you-badge">YOU</span>}
                  </>
                ) : (
                  <>
                    <span className="lobby-player-dot empty" />
                    <span className="lobby-player-name waiting">Waiting for player...</span>
                    <span className="lobby-waiting-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {error && <p className="home-error">{error}</p>}

        {isHost && (
          <button className="btn btn-primary btn-full" onClick={handleStart}
            disabled={!isFull || loading}>
            {loading ? '⏳ Starting...' : isFull ? '🌀 Start Game' : `⏳ Waiting for ${needed - joinedCount} more player(s)`}
          </button>
        )}

        {!isHost && (
          <div className="lobby-waiting-message" style={{ textAlign: 'center', marginTop: '12px', color: 'var(--text-secondary)' }}>
            {isFull
              ? '✅ All players joined — waiting for host to start...'
              : `⏳ Waiting for ${needed - joinedCount} more player(s)...`}
          </div>
        )}

        <button className="btn btn-outline btn-full" onClick={onLeave} style={{ marginTop: '12px', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          🚪 Leave Room
        </button>
      </div>
    </div>
  )
}
