const API = '/api';

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// === ROOM API ===

export const createRoom = (hostName, playerCount, mode = 'normal') =>
  fetchJSON(`${API}/rooms`, {
    method: 'POST',
    body: JSON.stringify({ host_name: hostName, player_count: playerCount, mode }),
  });

export const joinRoom = (code, playerName) =>
  fetchJSON(`${API}/rooms/${code.toUpperCase()}/join`, {
    method: 'POST',
    body: JSON.stringify({ player_name: playerName }),
  });

export const getRoomState = (code, playerId) =>
  fetchJSON(`${API}/rooms/${code}?pid=${playerId}`);

export const startGame = (code, playerId) =>
  fetchJSON(`${API}/rooms/${code}/start`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  });

// === GAME API ===

export const chooseSeeker = (code, playerId, choiceIndex) =>
  fetchJSON(`${API}/rooms/${code}/choose-seeker`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, choice_index: choiceIndex }),
  });

export const chooseContracts = (code, playerId, chosenIndices) =>
  fetchJSON(`${API}/rooms/${code}/choose-contracts`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, chosen_indices: chosenIndices }),
  });

export const doAction = (code, playerId, action, params = {}) =>
  fetchJSON(`${API}/rooms/${code}/action`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, action, params }),
  });
