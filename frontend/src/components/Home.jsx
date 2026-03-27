import { useState, useEffect } from 'react'
import { createRoom, joinRoom } from '../api'
import Rulebook from './Rulebook'

export default function Home({ onRoomJoined }) {
  const [mode, setMode] = useState('menu') // menu, create, join
  const [name, setName] = useState(localStorage.getItem('shardfall_name') || '')
  const [playerCount, setPlayerCount] = useState(3)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showRulebook, setShowRulebook] = useState(false)

  const [gameMode, setGameMode] = useState('normal') // normal or fast

  // Check URL for room code (shared link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomCode = params.get('room')
    if (roomCode) {
      setJoinCode(roomCode.toUpperCase())
      setMode('join')
    }
  }, [])

  const handleCreate = async () => {
    console.log("handleCreate CALLED with name:", name, "playerCount:", playerCount, "mode:", gameMode);
    if (!name.trim()) { setError('Enter your name'); return }
    setLoading(true); setError(null)
    try {
      console.log("Calling API createRoom...");
      const data = await createRoom(name.trim(), playerCount, gameMode)
      console.log("API returned:", data);
      localStorage.setItem('shardfall_name', name.trim())
      localStorage.setItem('shardfall_room', data.room_code)
      localStorage.setItem('shardfall_pid', data.player_id)
      onRoomJoined(data.room_code, data.player_id, data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleJoin = async () => {
    if (!name.trim()) { setError('Enter your name'); return }
    if (!joinCode.trim()) { setError('Enter room code'); return }
    setLoading(true); setError(null)
    try {
      const data = await joinRoom(joinCode.trim(), name.trim())
      localStorage.setItem('shardfall_name', name.trim())
      localStorage.setItem('shardfall_room', data.room_code)
      localStorage.setItem('shardfall_pid', data.player_id)
      onRoomJoined(data.room_code, data.player_id, data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="landing">
      <h1 className="landing-title">SHARDFALL</h1>
      <p className="landing-subtitle">Chronicles of the Beyond — V2</p>

      {mode === 'menu' && (
        <div className="landing-form">
          <div className="home-name-input">
            <label>Your Name</label>
            <input type="text" placeholder="Enter your name..." value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setMode('create')}
              autoFocus
            />
          </div>
          <div className="home-buttons">
            <button className="btn btn-primary btn-full" onClick={() => name.trim() ? setMode('create') : setError('Enter your name')}>
              🌀 Create Game
            </button>
            <button className="btn btn-outline btn-full" onClick={() => name.trim() ? setMode('join') : setError('Enter your name')}>
              🔗 Join Game
            </button>
          </div>
          {error && <p className="home-error">{error}</p>}
          <p className="home-footer">
            V2: Portal Claims & Tolls · Contracts · Hand Limit · Tier Gating
          </p>
          <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
            <button className="btn btn-outline btn-full btn-rulebook" onClick={() => setShowRulebook(true)}>📖 View Rulebook</button>
          </div>
        </div>
      )}

      {showRulebook && <Rulebook onClose={() => setShowRulebook(false)} />}

      {mode === 'create' && (
        <div className="landing-form">
          <h2>⚔️ Create Game</h2>
          <p className="home-welcome">Playing as <strong>{name}</strong></p>
          
          <div className="home-input-group">
            <label>Player Count</label>
            <div className="player-count-controls">
              <button className="btn btn-small btn-outline" onClick={() => setPlayerCount(Math.max(2, playerCount - 1))} disabled={playerCount <= 2}>−</button>
              <span>{playerCount} Players</span>
              <button className="btn btn-small btn-outline" onClick={() => setPlayerCount(Math.min(5, playerCount + 1))} disabled={playerCount >= 5}>+</button>
            </div>
          </div>

          <div className="home-input-group">
            <label>Game Mode</label>
            <div className="mode-toggle">
              <button 
                className={`btn btn-small ${gameMode === 'normal' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setGameMode('normal')}
              >
                Standard (7)
              </button>
              <button 
                className={`btn btn-small ${gameMode === 'fast' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setGameMode('fast')}
              >
                Fast Mode (5)
              </button>
            </div>
            <p className="mode-desc">
              {gameMode === 'fast' ? "✨ 5 Constructs to win. Fast-paced gating." : "📜 7 Constructs to win. Standard strategic depth."}
            </p>
          </div>

          {error && <p className="home-error">{error}</p>}
          <button className="btn btn-primary btn-full" onClick={handleCreate} disabled={loading} style={{ marginTop: 8 }}>
            {loading ? '⏳ Creating...' : '🌀 Open the Portals'}
          </button>
          <button className="btn btn-outline btn-small" onClick={() => { setMode('menu'); setError(null) }} style={{ marginTop: 12 }}>
            ← Back
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="landing-form">
          <h2>🔗 Join Game</h2>
          <p className="home-welcome">Playing as <strong>{name}</strong></p>
          <div className="home-name-input">
            <label>Room Code</label>
            <input type="text" placeholder="e.g. X7K2" value={joinCode} maxLength={6}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '6px', fontWeight: 700 }}
              autoFocus
            />
          </div>
          {error && <p className="home-error">{error}</p>}
          <button className="btn btn-primary btn-full" onClick={handleJoin} disabled={loading || joinCode.length < 4}>
            {loading ? '⏳ Joining...' : '🚀 Join Room'}
          </button>
          <button className="btn btn-outline btn-small" onClick={() => { setMode('menu'); setError(null) }} style={{ marginTop: 12 }}>
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}
