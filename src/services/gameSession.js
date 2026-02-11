import { ref, set, onValue, update, remove, get } from 'firebase/database';
import { database } from '../firebase';

// Generate random 6-character game code
export function generateGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new game session
export async function createGameSession(gameCode, gameSettings) {
  const gameRef = ref(database, `games/${gameCode}`);
  
  await set(gameRef, {
    settings: gameSettings,
    state: {
      currentTeamIndex: 0,
      gamePhase: 'waiting',
      currentSong: null,
      usedSongIds: [],
      lastPlacement: null
    },
    teams: gameSettings.teamNames.map((name) => ({
      name,
      score: 0,
      timeline: [],
      connected: false,
      deviceId: null
    })),
    createdAt: Date.now(),
    hostDeviceId: null
  });
  
  return gameCode;
}

// Join an existing game session with team name
export async function joinGameSession(gameCode, teamName, deviceId) {
  const teamsRef = ref(database, `games/${gameCode}/teams`);
  
  // Get current teams
  const snapshot = await get(teamsRef);
  const teams = snapshot.exists() ? snapshot.val() : [];
  
  // Add new team
  const newTeam = {
    name: teamName,
    score: 0,
    timeline: [],
    connected: true,
    deviceId: deviceId
  };
  
  teams.push(newTeam);
  const teamIndex = teams.length - 1;
  
  await set(teamsRef, teams);
  
  return teamIndex;
}

// Check if game code exists
export async function checkGameExists(gameCode) {
  const gameRef = ref(database, `games/${gameCode}`);
  const snapshot = await get(gameRef);
  return snapshot.exists();
}

// Subscribe to game updates
export function subscribeToGame(gameCode, callback) {
  const gameRef = ref(database, `games/${gameCode}`);
  return onValue(gameRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
}

// Update game state
export async function updateGameState(gameCode, stateUpdates) {
  const stateRef = ref(database, `games/${gameCode}/state`);
  await update(stateRef, stateUpdates);
}

// Update team data
export async function updateTeamData(gameCode, teamIndex, teamData) {
  const teamRef = ref(database, `games/${gameCode}/teams/${teamIndex}`);
  await update(teamRef, teamData);
}

// Clean up game session
export async function deleteGameSession(gameCode) {
  const gameRef = ref(database, `games/${gameCode}`);
  await remove(gameRef);
}

// Mark device as host
export async function setHostDevice(gameCode, deviceId) {
  const hostRef = ref(database, `games/${gameCode}/hostDeviceId`);
  await set(hostRef, deviceId);
}

// Generate unique device ID
export function getDeviceId() {
  let deviceId = localStorage.getItem('chronotunes_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chronotunes_device_id', deviceId);
  }
  return deviceId;
}
