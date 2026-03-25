import { useState, useEffect, useCallback } from 'react'
import { getRoomState, chooseSeeker, chooseContracts } from './api'
import Home from './components/Home'
import Lobby from './components/Lobby'
import Game from './components/Game'

export default function App() {
  const [screen, setScreen] = useState('home') // home, lobby, seeker, contracts, game
  const [roomCode, setRoomCode] = useState(null)
  const [playerId, setPlayerId] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedContracts, setSelectedContracts] = useState([])

  // On mount — try to reconnect to a saved room
  useEffect(() => {
    const savedRoom = localStorage.getItem('shardfall_room')
    const savedPid = localStorage.getItem('shardfall_pid')
    if (savedRoom && savedPid) {
      getRoomState(savedRoom, savedPid)
        .then(state => {
          setRoomCode(savedRoom)
          setPlayerId(savedPid)
          setGameState(state)
          routeToScreen(state)
        })
        .catch(() => {
          // Room expired — clear and show home
          localStorage.removeItem('shardfall_room')
          localStorage.removeItem('shardfall_pid')
        })
    }
  }, [])

  const routeToScreen = (state) => {
    if (!state.phase && state.room_status === 'waiting') {
      setScreen('lobby')
    } else if (state.phase === 'setup') {
      setScreen('seeker')
    } else if (state.phase === 'contracts') {
      setSelectedContracts([])
      setScreen('contracts')
    } else if (['playing', 'discard', 'game_over'].includes(state.phase)) {
      setScreen('game')
    }
  }

  const handleRoomJoined = useCallback((code, pid, state) => {
    setRoomCode(code)
    setPlayerId(pid)
    setGameState(state)
    setScreen('lobby')
  }, [])

  const handleGameStart = useCallback((state) => {
    setGameState(state)
    routeToScreen(state)
  }, [])

  const handleChooseSeeker = async (choiceIndex) => {
    setLoading(true); setError(null)
    try {
      const state = await chooseSeeker(roomCode, playerId, choiceIndex)
      setGameState(state)
      routeToScreen(state)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleToggleContract = (idx) => {
    setSelectedContracts(prev => {
      if (prev.includes(idx)) return prev.filter(i => i !== idx)
      if (prev.length >= 2) return [...prev.slice(1), idx]
      return [...prev, idx]
    })
  }

  const handleConfirmContracts = async () => {
    if (selectedContracts.length !== 2) return
    setLoading(true); setError(null)
    try {
      const state = await chooseContracts(roomCode, playerId, selectedContracts)
      setGameState(state)
      routeToScreen(state)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleLeave = () => {
    localStorage.removeItem('shardfall_room')
    localStorage.removeItem('shardfall_pid')
    setRoomCode(null)
    setPlayerId(null)
    setGameState(null)
    setScreen('home')
    window.history.replaceState({}, '', window.location.pathname)
  }

  // === HOME ===
  if (screen === 'home') {
    return <Home onRoomJoined={handleRoomJoined} />
  }

  // === LOBBY ===
  if (screen === 'lobby' && roomCode) {
    return (
      <Lobby
        roomCode={roomCode}
        playerId={playerId}
        initialState={gameState}
        onGameStart={handleGameStart}
      />
    )
  }

  // === SEEKER SELECTION (multiplayer: just YOUR choice) ===
  if (screen === 'seeker' && gameState) {
    const myIndex = gameState.your_index
    const me = gameState.players?.[myIndex]
    const mySeeker = me?.seeker

    // Already chosen — wait for others
    if (mySeeker) {
      return (
        <WaitingScreen
          title="Seeker Chosen!"
          message={`You picked ${mySeeker.icon} ${mySeeker.name}. Waiting for other players...`}
          roomCode={roomCode}
          playerId={playerId}
          onStateUpdate={(state) => { setGameState(state); routeToScreen(state) }}
        />
      )
    }

    return (
      <div className="seeker-select">
        <h1>Choose Your Seeker</h1>
        <h2>Pick your power:</h2>
        <div className="seeker-choices">
          {me?.seeker_choices?.map((seeker, i) => (
            <div className="seeker-card" key={seeker.id} onClick={() => !loading && handleChooseSeeker(i)}>
              <span className="seeker-icon">{seeker.icon}</span>
              <div className="seeker-name" style={{ color: seeker.color }}>{seeker.name}</div>
              <div className="seeker-desc">{seeker.description}</div>
            </div>
          ))}
        </div>
        {error && <p style={{ color: 'var(--danger)', marginTop: '16px' }}>{error}</p>}
      </div>
    )
  }

  // === CONTRACT SELECTION (multiplayer: just YOUR choice) ===
  if (screen === 'contracts' && gameState) {
    const myIndex = gameState.your_index
    const me = gameState.players?.[myIndex]
    const myContracts = me?.contracts || []
    const myChoices = me?.contract_choices || []

    // Already chosen — wait for others
    if (myContracts.length > 0 && myChoices.length === 0) {
      return (
        <WaitingScreen
          title="Contracts Chosen!"
          message="Waiting for other players to choose their contracts..."
          roomCode={roomCode}
          playerId={playerId}
          onStateUpdate={(state) => { setGameState(state); routeToScreen(state) }}
        />
      )
    }

    if (myChoices.length === 0) {
      return (
        <WaitingScreen
          title="Waiting..."
          message="Waiting for contract phase to begin..."
          roomCode={roomCode}
          playerId={playerId}
          onStateUpdate={(state) => { setGameState(state); routeToScreen(state) }}
        />
      )
    }

    return (
      <div className="seeker-select">
        <h1>📜 Choose Your Contracts</h1>
        <h2>Pick 2 secret objectives (select 2 of 3):</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px', maxWidth: 500, textAlign: 'center' }}>
          Completed contracts earn VP at game end. Failed contracts lose 2 VP each. Keep them secret!
        </p>
        <div className="seeker-choices" style={{ gap: '16px' }}>
          {myChoices.map((contract, i) => (
            <div key={contract.id}
              className={`seeker-card ${selectedContracts.includes(i) ? 'selected' : ''}`}
              onClick={() => handleToggleContract(i)}
              style={selectedContracts.includes(i) ? { borderColor: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' } : {}}>
              <span className="seeker-icon">{contract.icon}</span>
              <div className="seeker-name" style={{ color: 'var(--accent)' }}>{contract.name}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--warning)', margin: '4px 0' }}>+{contract.vp} VP</div>
              <div className="seeker-desc">{contract.requirement}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '8px' }}>−2 VP if failed</div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginTop: '24px' }}
          disabled={selectedContracts.length !== 2 || loading}
          onClick={handleConfirmContracts}>
          ✅ Confirm {selectedContracts.length}/2 Contracts
        </button>
        {error && <p style={{ color: 'var(--danger)', marginTop: '16px' }}>{error}</p>}
      </div>
    )
  }

  // === GAME ===
  if (screen === 'game' && gameState) {
    return (
      <Game
        initialState={gameState}
        roomCode={roomCode}
        playerId={playerId}
        myIndex={gameState.your_index}
        onLeave={handleLeave}
      />
    )
  }

  return null
}


// === WAITING SCREEN (polling for others) ===
function WaitingScreen({ title, message, roomCode, playerId, onStateUpdate }) {
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const state = await getRoomState(roomCode, playerId)
        onStateUpdate(state)
      } catch (e) { /* ignore */ }
    }, 2000)
    return () => clearInterval(interval)
  }, [roomCode, playerId, onStateUpdate])

  return (
    <div className="seeker-select">
      <h1>{title}</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '16px' }}>{message}</p>
      <div className="lobby-waiting-dots" style={{ fontSize: '2rem', marginTop: '24px' }}>
        <span>.</span><span>.</span><span>.</span>
      </div>
    </div>
  )
}
