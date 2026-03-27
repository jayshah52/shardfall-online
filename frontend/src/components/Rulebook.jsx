import React, { useState } from 'react';

const SEEKERS = [
  { name: 'Ember Seeker', power: 'ember_extract_bonus', icon: '🔥', color: '#ff8a65', desc: 'When harvesting from an Ember Portal, pay +1 stability for +3 Gems bonus.' },
  { name: 'Tide Seeker', power: 'free_stabilize', icon: '💧', color: '#4fc3f7', desc: '1 FREE Stabilize per round (0 gems).' },
  { name: 'Verdant Seeker', power: 'trade_discount', icon: '🌿', color: '#81c784', desc: 'Bank trades cost 2:1 instead of 3:1.' },
  { name: 'Storm Seeker', power: 'extra_action', icon: '⚡', color: '#f1c40f', desc: '3 actions per turn. (Max 1 Harvest per turn).' },
  { name: 'Void Seeker', power: 'build_discount', icon: '🌐', color: '#9b59b6', desc: 'All Constructs cost 1 fewer Gem (cheapest removed).' },
  { name: 'Wanderer', power: 'double_explore', icon: '🧭', color: '#1abc9c', desc: 'Gain 2 Explorer Tokens (instead of 1) for new Portal types.' },
  { name: 'Sentinel', power: 'collapse_bonus', icon: '🛡️', color: '#7f8c8d', desc: 'Immune to backlash. Gain 2 random Gems if a portal collapses during harvest.' },
  { name: 'Diplomat', power: 'toll_immune', icon: '🤝', color: '#e67e22', desc: 'Never pays Tolls when harvesting from claimed Portals.' }
];

const ANOMALIES = [
  { name: 'Dimensional Surge', icon: '🌋', desc: 'All active Portals lose 1 stability immediately!' },
  { name: 'Gem Rain', icon: '🎁', desc: 'Every player draws 2 random Gems from the supply.' },
  { name: 'Reality Shift', icon: '🔄', desc: 'The Construct Display is cleared and completely replaced.' },
  { name: 'Portal Storm', icon: '⚡', desc: 'The portal with the lowest stability collapses immediately!' },
  { name: 'Dimensional Calm', icon: '💫', desc: 'All active Portals gain +1 stability (up to max).' },
  { name: 'Convergence', icon: '🤝', desc: 'Each player contributes 2 gems -> Fracture -1 per contributor.' },
  { name: 'Market Surge', icon: '🎭', desc: 'Market size expands to 6! Everyone gets 1 free gem.' },
  { name: 'Portal Merge', icon: '🌀', desc: 'Lowest stability portal is destroyed; 2nd lowest gains +2 stability.' }
];

const MILESTONES = [
  { name: 'Pioneer', vp: 3, icon: '🧭', desc: 'First to discover all 5 Portal elements.' },
  { name: 'Foundation', vp: 1, icon: '🏗️', desc: 'Build 2 Small constructs.' },
  { name: 'Daredevil', vp: 2, icon: '💀', desc: 'Perform 3 Deep Harvests.' },
  { name: 'Diplomat', vp: 1, icon: '🤝', desc: 'Complete 3 Trades.' },
  { name: 'Toll Baron', vp: 2, icon: '💰', desc: 'First to collect 3 Tolls.' },
  { name: 'Architect', vp: 1, icon: '🏘️', desc: 'Build your first Medium construct.' },
  { name: 'Titan', vp: 2, icon: '🏛️', desc: 'First to build a Large construct.' }
];

const CONSTRUCTS = {
  small: [
    { name: 'Gem Lens', cost: '🔥x2,💧x1', vp: 2, desc: 'Gather action takes 2 gems instead of 1.' },
    { name: 'Drift Anchor', cost: '🌿x2,⚡x1', vp: 2, desc: 'Stabilize action costs 1 gem instead of 2.' },
    { name: 'Trade Post', cost: '💧x1,🌿x1,⚡x1', vp: 2, desc: 'Bank trades are 2:1.' },
    { name: 'Warden\'s Seal', cost: '🔥💧🌿⚡', vp: 3, desc: 'High VP foundation.' },
    { name: 'Compass Stone', cost: '🌐x2', vp: 2, desc: 'Gain 1 Explorer Token immediately.' },
    { name: 'Gem Forge', cost: '🔥x3', vp: 2, desc: 'Free: Convert 1 gem to any other type once per round.' },
    { name: 'Echo Chamber', cost: '🌐x2,🔥x1', vp: 3, desc: 'Resonance chamber foundation.' },
    { name: 'Toll Gate', cost: '⚡x2,💧x1', vp: 2, desc: 'Tolls you collect are 2 gems instead of 1.' },
    { name: 'Scout Tower', cost: '🌿x1,💧x1,🌐x1', vp: 2, desc: 'See next Portal card at start of turn.' }
  ],
  medium: [
    { name: 'Portal Engine', cost: '🔥x2,💧x2,🌐x1', vp: 4, desc: 'Harvesting costs 1 less stability.' },
    { name: 'Harmony Spire', cost: '🌿x2,⚡x2,💧x1', vp: 5, desc: 'High VP mid-game engine.' },
    { name: 'Crystal Bastion', cost: '💧x2,🌿x2,⚡x2', vp: 5, desc: 'Hand limit is raised to 12.' },
    { name: 'Storm Harvester', cost: '⚡x3,🔥x1,🌐x1', vp: 4, desc: 'Storm-charged extraction engine.' },
    { name: 'Alliance Hall', cost: '🔥💧🌿⚡🌐', vp: 5, desc: 'Diversity engine.' },
    { name: 'Toll Fortress', cost: '🔥x2,⚡x2,🌐x1', vp: 4, desc: 'Your portal claims last 2 rounds instead of 1.' },
    { name: 'Market Engine', cost: '💧x2,🌿x2,🔥x1', vp: 4, desc: 'When you Collect, also take 1 random gem from supply.' }
  ],
  large: [
    { name: 'Nexus Spire', cost: '🔥x2,💧x2,🌿x2,🌐x1', vp: 7, desc: 'Stabilize gives 2 Guardian Tokens instead of 1.' },
    { name: 'World Anchor', cost: '⚡x4,🔥x2,💧x1', vp: 6, desc: 'If Fracture <= 2 at game end, gain +4 VP bonus.' },
    { name: 'Guardian Citadel', cost: '💧x3,🌿x3,🌐x1', vp: 7, desc: 'Guardian Tokens worth 2 VP each at end game.' },
    { name: 'Explorer Atlas', cost: '⚡x2,🔥x2,🌿x2,🌐x1', vp: 7, desc: 'Explorer Tokens worth 2 VP each at end game.' },
    { name: 'Dimensional Forge', cost: '🔥🔥💧💧🌿🌿⚡⚡🌐🌐', vp: 8, desc: 'The ultimate VP construct.' },
    { name: 'Toll Empire', cost: '⚡x3,🔥x2,💧x2', vp: 6, desc: '+1 VP per gem collected via tolls.' }
  ]
};

const CONTRACTS = [
  { name: 'The Guardian', icon: '🛡️', vp: 6, desc: 'Have 5+ Guardian Tokens.' },
  { name: 'Universal Explorer', icon: '🧭', vp: 8, desc: 'Discover all 5 Portal elements.' },
  { name: 'Essence Hoarder', icon: '💰', vp: 5, desc: 'End with exactly 10 gems in hand.' },
  { name: 'Master Builder', icon: '🏗️', vp: 7, desc: 'Build 2+ Large Constructs.' },
  { name: 'Toll Collector', icon: '🤝', vp: 5, desc: 'Collect 5+ gems in tolls.' },
  { name: 'Portal Warden', icon: '🌀', vp: 6, desc: 'Stabilize 4+ unique Portals.' },
  { name: 'Specialist', icon: '🎯', vp: 4, desc: 'Have 8+ gems of a single type.' },
  { name: 'Rainbow', icon: '💎', vp: 7, desc: 'End with 2+ of each gem type.' },
  { name: 'Trader', icon: '♻️', vp: 5, desc: 'Complete 6+ trades.' },
  { name: 'Ember Lord', icon: '🔥', vp: 4, desc: 'Harvest from 3+ Ember Portals.' },
  { name: 'Tide Lord', icon: '💧', vp: 4, desc: 'Harvest from 3+ Tide Portals.' },
  { name: 'Daredevil', icon: '💀', vp: 5, desc: '3+ Deep Harvests.' },
  { name: 'Fortress', icon: '🏰', vp: 6, desc: 'Build 3+ Constructs with abilities.' },
  { name: 'World Saver', icon: '🌍', vp: 8, desc: 'End game with Fracture <= 2.' },
  { name: 'Speed Builder', icon: '⚡', vp: 3, desc: 'First to build a Large construct.' }
];

export default function Rulebook({ onClose }) {
  const [activeTab, setActiveTab] = useState('seekers');

  const tabs = [
    { id: 'seekers', name: 'Characters', icon: '🧙' },
    { id: 'constructs', name: 'Constructs', icon: '🏗️' },
    { id: 'anomalies', name: 'Anomalies', icon: '⚡' },
    { id: 'milestones', name: 'Milestones', icon: '🏅' },
    { id: 'contracts', name: 'Contracts', icon: '📜' }
  ];

  return (
    <div className="modal-overlay rulebook-overlay" onClick={onClose}>
      <div className="modal rulebook-modal tabs-layout" onClick={e => e.stopPropagation()}>
        <div className="rulebook-sidebar">
          <div className="sidebar-header">
            <h3>📖 Rulebook</h3>
          </div>
          <div className="sidebar-tabs">
            {tabs.map(tab => (
              <button key={tab.id}
                className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}>
                <span className="tab-icon">{tab.icon}</span> {tab.name}
              </button>
            ))}
          </div>
          <button className="btn btn-outline btn-full" style={{ marginTop: 'auto' }} onClick={onClose}>Close</button>
        </div>

        <div className="rulebook-content">
          {activeTab === 'seekers' && (
            <div className="rule-view">
              <h2>🧙 Seeker Powers</h2>
              <p className="tab-intro">Each player starts with a unique ability that shapes their strategy.</p>
              <div className="rule-grid">
                {SEEKERS.map(s => (
                  <div key={s.name} className="rule-card" style={{ borderLeft: `4px solid ${s.color}` }}>
                    <div className="card-header">
                      <strong>{s.icon} {s.name}</strong>
                    </div>
                    <p className="card-desc">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'constructs' && (
            <div className="rule-view">
              <h2>🏗️ Construct Tiers</h2>
              <div className="tier-section">
                <h3>Small (Utility)</h3>
                <div className="rule-grid small">
                  {CONSTRUCTS.small.map(c => (
                    <div key={c.name} className="rule-card mini">
                      <strong>{c.name}</strong>
                      <span className="card-cost">{c.cost}</span>
                      <p>{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="tier-section">
                <h3>Medium (Engine) — Needs 2 Small</h3>
                <div className="rule-grid small">
                  {CONSTRUCTS.medium.map(c => (
                    <div key={c.name} className="rule-card mini">
                      <strong>{c.name}</strong>
                      <span className="card-cost">{c.cost}</span>
                      <p>{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="tier-section">
                <h3>Large (Masterwork) — Needs 2S + 1M</h3>
                <div className="rule-grid small">
                  {CONSTRUCTS.large.map(c => (
                    <div key={c.name} className="rule-card mini">
                      <strong>{c.name}</strong>
                      <span className="card-cost">{c.cost}</span>
                      <p>{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'anomalies' && (
            <div className="rule-view">
              <h2>⚡ Anomaly Events</h2>
              <p className="tab-intro">Immediate effects triggered when drawn from the Portal deck.</p>
              <div className="rule-grid">
                {ANOMALIES.map(a => (
                  <div key={a.name} className="rule-card">
                    <div className="card-header">
                      <strong>{a.icon} {a.name}</strong>
                    </div>
                    <p className="card-desc">{a.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'milestones' && (
            <div className="rule-view">
              <h2>🏅 Game Milestones</h2>
              <p className="tab-intro">Public achievements that award bonus VP. Most are first-come, first-served.</p>
              <div className="rule-grid">
                {MILESTONES.map(m => (
                  <div key={m.name} className="rule-card">
                    <div className="card-header">
                      <strong>{m.icon} {m.name}</strong>
                      <span className="item-vp">+{m.vp} VP</span>
                    </div>
                    <p className="card-desc">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="rule-view">
              <h2>📜 Secret Contracts</h2>
              <p className="tab-intro">Private goals revealed at game end. Success awards VP; failure costs -2 VP.</p>
              <div className="rule-grid small">
                {CONTRACTS.map(c => (
                  <div key={c.name} className="rule-card mini">
                    <div className="card-header">
                      <strong>{c.icon} {c.name}</strong>
                      <span className="item-vp">+{c.vp} VP</span>
                    </div>
                    <p>{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
