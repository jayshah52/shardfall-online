const SCORE_LABELS = {
  constructs: '🏗️ Constructs', guardian_tokens: '🛡️ Guardian Tokens',
  explorer_tokens: '🧭 Explorer Tokens', gem_sets: '💎 Gem Sets',
  contracts: '📜 Contracts', most_guardians: '👑 Most Guardians',
  most_explorers: '🗺️ Most Explorers', fracture_bonus: '🌍 World Anchor',
  toll_empire: '🔖 Toll Empire', fracture_penalty: '💀 Fracture Penalty',
  last_collapse: '💥 Last Collapse',
}

export default function ScoreModal({ state, onNewGame }) {
  const players = state.players.filter(p => p.score)
  const sorted = [...players].sort((a, b) => b.score.total - a.score.total)
  const winner = sorted[0]

  const allCats = new Set()
  players.forEach(p => {
    if (p.score?.breakdown) Object.keys(p.score.breakdown).forEach(k => allCats.add(k))
  })

  return (
    <div className="modal-overlay">
      <div className="modal score-modal">
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>🏆 Game Over!</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
          {state.game_end_trigger === 'fracture' ? '💀 World fractured! All lose 5 VP.'
            : state.game_end_trigger === 'constructs' ? `${winner?.name} built ${state.constructs_end_count || 5} Constructs!`
            : 'Portal deck exhausted.'}
        </p>

        <table className="score-table">
          <thead>
            <tr>
              <th>Category</th>
              {sorted.map(p => <th key={p.index} style={{ color: p.color }}>{p.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...allCats].map(cat => (
              <tr key={cat}>
                <td>{SCORE_LABELS[cat] || cat}</td>
                {sorted.map(p => {
                  const val = p.score?.breakdown?.[cat] || 0
                  return <td key={p.index} className={val < 0 ? 'negative' : val > 0 ? 'positive' : ''}>{val > 0 ? `+${val}` : val}</td>
                })}
              </tr>
            ))}
            <tr className="total-row">
              <td>Total VP</td>
              {sorted.map(p => (
                <td key={p.index} style={p.index === winner?.index ? { color: 'var(--accent)' } : {}}>
                  {p.score?.total || 0}{p.index === winner?.index && ' 🏆'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        {/* Contract Results */}
        <h3 style={{ fontSize: '1rem', margin: '16px 0 8px' }}>📜 Contract Results</h3>
        <div className="contracts-grid">
          {sorted.map(p => (
            <div key={p.index} style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 600, color: p.color, fontSize: '0.9rem', marginBottom: '4px' }}>{p.name}</div>
              {p.contract_results?.map((cr, i) => (
                <div key={i} style={{ fontSize: '0.8rem', padding: '4px 8px', background: cr.completed ? 'rgba(102,187,106,0.1)' : 'rgba(239,83,80,0.1)',
                  borderRadius: '4px', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{cr.contract.icon} {cr.contract.name}</span>
                  <span style={{ fontWeight: 700, color: cr.completed ? 'var(--success)' : 'var(--danger)' }}>
                    {cr.completed ? `+${cr.vp} ✓` : `${cr.vp} ✗`}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Fun End-Game Awards */}
        <div className="awards-section" style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '12px', textAlign: 'center', color: 'var(--warning)' }}>🌟 Post-Game Awards</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
            {[
              { key: 'deep_harvests', icon: '⛏️', title: 'Deep Diver' },
              { key: 'tolls_collected', icon: '💰', title: 'Toll King' },
              { key: 'trades_completed', icon: '🤝', title: 'Master Trader' },
              { key: 'guardian_tokens', icon: '🛡️', title: 'Portal Guardian' },
              { key: 'milestones', icon: '🏆', title: 'Overachiever' },
            ].map(award => {
              let max = 0; let winners = [];
              players.forEach(p => {
                const val = (award.key === 'milestones' ? p.milestones?.length : p[award.key]) || 0;
                if (val > max) { max = val; winners = [p]; }
                else if (val === max && val > 0) { winners.push(p); }
              });
              if (max === 0) return null;
              return (
                <div key={award.key} style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{award.icon}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{award.title}</div>
                  <div style={{ fontSize: '0.85rem', color: winners[0].color, fontWeight: 700, marginTop: '2px' }}>
                    {winners.map(w => w.name).join(', ')} <span style={{ color: 'var(--text-secondary)' }}>({max})</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button className="btn btn-primary" onClick={onNewGame}>🔄 New Game</button>
        </div>
      </div>
    </div>
  )
}
