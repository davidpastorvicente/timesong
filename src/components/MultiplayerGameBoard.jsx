import { useState, useEffect, useCallback } from 'react';
import { subscribeToGame, updateGameState, updateTeamData, setHostDevice } from '../services/gameSession';
import { songSets } from '../data/songs';
import GameBoard from './GameBoard';

// Function to fetch Deezer preview URL and album cover dynamically
async function fetchDeezerData(deezerId) {
  try {
    const response = await fetch(`https://cors.eu.org/https://api.deezer.com/track/${deezerId}`);
    const data = await response.json();
    return {
      previewUrl: data.preview || null,
      albumCover: data.album?.cover_medium || null
    };
  } catch (error) {
    console.error('Error fetching Deezer data:', error);
    return { previewUrl: null, albumCover: null };
  }
}

export default function MultiplayerGameBoard({ gameConfig, language }) {
  const { mode, gameCode, myTeamIndex, deviceId, isHost } = gameConfig;
  const [gameData, setGameData] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize game state for host
  const initializeGame = useCallback(async () => {
    if (!isHost || initialized || !gameCode) return;
    
    const { songSet } = gameConfig;
    const selectedSongs = songSets[songSet]?.songs || songSets.everything.songs;
    
    // Draw first song
    const randomIndex = Math.floor(Math.random() * selectedSongs.length);
    const song = selectedSongs[randomIndex];
    
    // Fetch Deezer data
    let previewUrl;
    let albumCover;
    if (song.deezerId) {
      const deezerData = await fetchDeezerData(song.deezerId);
      previewUrl = deezerData.previewUrl;
      albumCover = deezerData.albumCover;
    }
    
    if (!previewUrl) {
      previewUrl = `https://www.youtube.com/embed/${song.youtubeId}?autoplay=1&controls=0`;
    }

    // Initialize game state in Firebase
    await updateGameState(gameCode, {
      gamePhase: 'playing',
      currentSong: { ...song, previewUrl, albumCover },
      usedSongIds: [song.youtubeId],
      currentTeamIndex: 0
    });

    await setHostDevice(gameCode, deviceId);
    setInitialized(true);
  }, [isHost, initialized, gameCode, gameConfig, deviceId]);

  useEffect(() => {
    if (mode !== 'multi' || !gameCode) return;

    // Initialize game if host
    if (isHost && !initialized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void initializeGame();
    }

    // Subscribe to game state changes
    const unsubscribe = subscribeToGame(gameCode, (data) => {
      if (data) {
        setGameData(data);
        // Check if it's this device's turn
        if (myTeamIndex !== null && myTeamIndex !== undefined) {
          const isTurn = data.state.currentTeamIndex === myTeamIndex;
          console.log('Turn check:', {
            myTeamIndex,
            currentTeamIndex: data.state.currentTeamIndex,
            isMyTurn: isTurn
          });
          setIsMyTurn(isTurn);
        } else {
          // Host spectator mode (shouldn't happen anymore)
          setIsMyTurn(false);
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [mode, gameCode, myTeamIndex, isHost, initialized, initializeGame]);

  // Single-device mode - just render GameBoard directly
  if (mode === 'single') {
    return <GameBoard gameConfig={gameConfig} language={language} />;
  }

  // Multiplayer mode - show waiting or playing based on turn
  if (!gameData || !gameData.state.currentSong) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-primary)' }}>
        <h2>Loading game...</h2>
      </div>
    );
  }

  const currentTeam = gameData.teams[gameData.state.currentTeamIndex];
  const t = language === 'es' ? 
    { waitingForTurn: 'Esperando a' } : 
    { waitingForTurn: 'Waiting for' };

  // Show game board for everyone, with different banners
  return (
    <div>
      {isMyTurn && myTeamIndex !== null ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '1rem', 
          background: 'var(--primary)', 
          color: 'white', 
          fontWeight: 'bold', 
          fontSize: '1.2rem',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          🎮 YOUR TURN!
        </div>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '1rem', 
          background: 'var(--text-secondary)', 
          color: 'white', 
          fontWeight: 'bold', 
          fontSize: '1.2rem',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          ⏳ {t.waitingForTurn} {currentTeam?.name || '...'}
        </div>
      )}
      <MultiplayerGameBoardActive
        gameConfig={gameConfig}
        gameData={gameData}
        language={language}
        onPlaceSong={handlePlaceSong}
        onNextTurn={handleNextTurn}
        isMyTurn={isMyTurn}
      />
    </div>
  );

  async function handlePlaceSong(timeline, score, isCorrect) {
    // Update team data in Firebase
    await updateTeamData(gameCode, myTeamIndex, {
      timeline: timeline,
      score: score
    });
    
    // Update last placement
    await updateGameState(gameCode, {
      lastPlacement: { correct: isCorrect, teamIndex: myTeamIndex }
    });
  }

  async function handleNextTurn(nextSong) {
    const nextTeamIndex = (gameData.state.currentTeamIndex + 1) % gameData.teams.length;
    
    await updateGameState(gameCode, {
      currentTeamIndex: nextTeamIndex,
      currentSong: nextSong,
      usedSongIds: [...gameData.state.usedSongIds, nextSong.youtubeId],
      gamePhase: 'playing'
    });
  }
}

// Component that handles the active turn gameplay
function MultiplayerGameBoardActive({ gameConfig, gameData, language, onPlaceSong, onNextTurn, isMyTurn }) {
  const { songSet, winningScore, myTeamIndex } = gameConfig;
  const [gamePhase, setGamePhase] = useState('playing');
  const [lastPlacement, setLastPlacement] = useState(null);

  const currentSong = gameData.state.currentSong;
  const myTeam = gameData.teams[myTeamIndex] || {};
  const myTimeline = myTeam.timeline || [];
  const myScore = myTeam.score || 0;

  const handlePlacement = async (position) => {
    if (!isMyTurn) return; // Prevent placement if not my turn
    const newTimeline = [...myTimeline];
    newTimeline.splice(position, 0, currentSong);

    const isCorrect = checkIfCorrectPlacement(newTimeline);
    const newScore = isCorrect ? myScore + 1 : myScore;

    if (isCorrect) {
      await onPlaceSong(newTimeline, newScore, true);
      setLastPlacement({ correct: true, position });
    } else {
      await onPlaceSong(myTimeline, myScore, false);
      setLastPlacement({ correct: false, position });
    }
    
    setGamePhase('result');
  };

  const checkIfCorrectPlacement = (timeline) => {
    for (let i = 0; i < timeline.length - 1; i++) {
      if (timeline[i].year > timeline[i + 1].year) {
        return false;
      }
    }
    return true;
  };

  const handleNextTurn = async () => {
    if (!isMyTurn) return; // Prevent turn advance if not my turn
    
    // Draw new song
    const selectedSongs = songSets[songSet]?.songs || songSets.everything.songs;
    const availableToPlay = selectedSongs.filter(song => 
      !gameData.state.usedSongIds.includes(song.youtubeId)
    );

    if (availableToPlay.length === 0) {
      // Game over - TODO: handle this
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableToPlay.length);
    const song = availableToPlay[randomIndex];

    // Fetch Deezer data
    let previewUrl;
    let albumCover;
    if (song.deezerId) {
      const deezerData = await fetchDeezerData(song.deezerId);
      previewUrl = deezerData.previewUrl;
      albumCover = deezerData.albumCover;
    }
    
    if (!previewUrl) {
      previewUrl = `https://www.youtube.com/embed/${song.youtubeId}?autoplay=1&controls=0`;
    }

    const nextSong = { ...song, previewUrl, albumCover };
    await onNextTurn(nextSong);
    setGamePhase('playing');
    setLastPlacement(null);
  };

  // Render using parts of GameBoard's JSX
  // (This is a simplified version - we're reusing GameBoard's visual components)
  return (
    <GameBoard 
      gameConfig={{
        mode: 'multi', // Pass multi mode to prevent reordering
        teamNames: gameData.teams.map(t => t.name),
        winningScore,
        songSet,
        myTeamIndex // Pass myTeamIndex to keep my team on top
      }}
      language={language}
      // Override internal state with Firebase data
      overrideState={{
        currentSong,
        currentTeamIndex: myTeamIndex, // This is for my current position
        actualCurrentTeamIndex: gameData.state.currentTeamIndex, // This is the actual active team
        teamTimelines: gameData.teams.map(t => t.timeline || []),
        scores: gameData.teams.map(t => t.score || 0),
        gamePhase,
        lastPlacement,
        onPlacement: handlePlacement,
        onNextTurn: handleNextTurn,
        isDisabled: !isMyTurn
      }}
    />
  );
}
