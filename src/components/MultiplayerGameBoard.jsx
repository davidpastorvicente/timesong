import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToGame, updateGameState, updatePlayerData, setHostDevice } from '../services/gameSession';
import { songSets } from '../data/songs';
import { translations } from '../translations';
import { fetchDeezerPreview } from '../utils/deezer';
import GameBoard from './GameBoard';
import './MultiplayerGameBoard.css';

export default function MultiplayerGameBoard({ gameConfig, language, onTurnIndicatorChange }) {
  const { mode, gameCode, myPlayerIndex, deviceId, isHost } = gameConfig;
  const [gameData, setGameData] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const initializingRef = useRef(false);

  // Initialize game state for host
  const initializeGame = useCallback(async () => {
    if (!isHost || initializingRef.current || !gameCode) return;
    initializingRef.current = true;
    
    const { songSet } = gameConfig;
    const selectedSongs = songSets[songSet]?.songs || songSets.everything.songs;
    
    // Draw first song
    const randomIndex = Math.floor(Math.random() * selectedSongs.length);
    const song = selectedSongs[randomIndex];
    
    // Fetch Deezer preview URL at runtime (they expire after ~24h)
    const { previewUrl, albumCover } = await fetchDeezerPreview(song);
    const firstSong = { ...song, previewUrl, albumCover };

    // Initialize game state in Firebase
    await updateGameState(gameCode, {
      gamePhase: 'playing',
      currentSong: firstSong,
      usedSongIds: [song.youtubeId],
      currentPlayerIndex: 0
    });

    await setHostDevice(gameCode, deviceId);
  }, [isHost, gameCode, gameConfig, deviceId]);

  useEffect(() => {
    if (mode !== 'multi' || !gameCode) return;

    // Initialize game if host
    if (isHost) {
      void initializeGame();
    }

    // Subscribe to game state changes
    const unsubscribe = subscribeToGame(gameCode, (data) => {
      if (data) {
        setGameData(data);
        // Check if it's this device's turn
        if (myPlayerIndex !== null && myPlayerIndex !== undefined) {
          const isTurn = data.state.currentPlayerIndex === myPlayerIndex;
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
  }, [mode, gameCode, myPlayerIndex, isHost, initializeGame]);

  // Update turn indicator in parent
  useEffect(() => {
    if (mode === 'single') {
      if (onTurnIndicatorChange) onTurnIndicatorChange(null);
      return;
    }

    if (!gameData || !gameData.state.currentSong) {
      if (onTurnIndicatorChange) onTurnIndicatorChange(null);
      return;
    }

    const currentPlayer = gameData.players[gameData.state.currentPlayerIndex];
    const t = translations[language];

    const turnIndicatorElement = (
      <div className="turn-indicator">
        {isMyTurn && myPlayerIndex !== null ? (
          <div className="turn-badge active">
            🎮 {t.yourTurn}
          </div>
        ) : (
          <div className="turn-badge waiting">
            ⏳ {currentPlayer?.name || '...'}
          </div>
        )}
      </div>
    );
    
    if (onTurnIndicatorChange) onTurnIndicatorChange(turnIndicatorElement);
  }, [mode, gameData, isMyTurn, myPlayerIndex, language, onTurnIndicatorChange]);

  // Single-device mode - just render GameBoard directly
  if (mode === 'single') {
    return <GameBoard gameConfig={gameConfig} language={language} />;
  }

  // Multiplayer mode - show waiting or playing based on turn
  if (!gameData || !gameData.state.currentSong) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-primary)' }}>
        <h2>⏳ {isHost ? 'Preparing first song...' : 'Waiting for host to start...'}</h2>
      </div>
    );
  }

  // Show game board for everyone
  return (
    <MultiplayerGameBoardActive
      gameConfig={gameConfig}
      gameData={gameData}
      language={language}
      onPlaceSong={handlePlaceSong}
      onNextTurn={handleNextTurn}
      isMyTurn={isMyTurn}
    />
  );

  async function handlePlaceSong(timeline, score, isCorrect, position) {
    // Update player data in Firebase
    await updatePlayerData(gameCode, myPlayerIndex, {
      timeline: timeline,
      score: score
    });
    
    // Check if this player won
    const { winningScore } = gameConfig;
    if (isCorrect && score >= winningScore) {
      // Winner! Update game state to game over
      await updateGameState(gameCode, {
        lastPlacement: { 
          correct: isCorrect, 
          playerIndex: myPlayerIndex,
          song: gameData.state.currentSong,
          position: position
        },
        gamePhase: 'gameOver',
        winner: myPlayerIndex
      });
    } else {
      // Update last placement and game phase to 'result' so all players see it
      await updateGameState(gameCode, {
        lastPlacement: { 
          correct: isCorrect, 
          playerIndex: myPlayerIndex,
          song: gameData.state.currentSong,
          position: position
        },
        gamePhase: 'result'
      });
    }
  }

  async function handleNextTurn(nextSong) {
    const nextPlayerIndex = (gameData.state.currentPlayerIndex + 1) % gameData.players.length;
    
    // Set loading phase first before changing turn/song
    await updateGameState(gameCode, {
      gamePhase: 'loading'
    });
    
    // Small delay to ensure all clients see loading state
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await updateGameState(gameCode, {
      currentPlayerIndex: nextPlayerIndex,
      currentSong: nextSong,
      usedSongIds: [...gameData.state.usedSongIds, nextSong.youtubeId],
      gamePhase: 'playing'
    });
  }
}

// Component that handles the active turn gameplay
function MultiplayerGameBoardActive({ gameConfig, gameData, language, onPlaceSong, onNextTurn, isMyTurn }) {
  const { songSet, winningScore, myPlayerIndex } = gameConfig;
  // Use gamePhase from Firebase instead of local state so all players see the same phase
  const gamePhase = gameData.state.gamePhase || 'playing';
  const lastPlacement = gameData.state.lastPlacement || null;

  const currentSong = gameData.state.currentSong;
  const myPlayer = gameData.players[myPlayerIndex] || {};
  const myTimeline = myPlayer.timeline || [];
  const myScore = myPlayer.score || 0;

  const handlePlacement = async (position) => {
    if (!isMyTurn) return; // Prevent placement if not my turn
    const newTimeline = [...myTimeline];
    newTimeline.splice(position, 0, currentSong);

    const isCorrect = checkIfCorrectPlacement(newTimeline);
    const newScore = isCorrect ? myScore + 1 : myScore;

    if (isCorrect) {
      await onPlaceSong(newTimeline, newScore, true, position);
    } else {
      await onPlaceSong(myTimeline, myScore, false, position);
    }
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

    // Fetch Deezer preview URL at runtime (they expire after ~24h)
    const { previewUrl, albumCover } = await fetchDeezerPreview(song);

    const nextSong = { ...song, previewUrl, albumCover };
    await onNextTurn(nextSong);
    // No need to set local state - Firebase handles gamePhase and lastPlacement
  };

  // Render using parts of GameBoard's JSX
  // (This is a simplified version - we're reusing GameBoard's visual components)
  return (
    <GameBoard 
      gameConfig={{
        mode: 'multi', // Pass multi mode to prevent reordering
        playerNames: gameData.players.map(t => t.name),
        winningScore,
        songSet,
        myPlayerIndex // Pass myPlayerIndex to keep my player on top
      }}
      language={language}
      // Override internal state with Firebase data
      overrideState={{
        currentSong,
        currentPlayerIndex: myPlayerIndex, // This is for my current position
        actualCurrentPlayerIndex: gameData.state.currentPlayerIndex, // This is the actual active player
        playerTimelines: gameData.players.map(t => t.timeline || []),
        scores: gameData.players.map(t => t.score || 0),
        gamePhase,
        lastPlacement,
        winner: gameData.state.winner,
        onPlacement: handlePlacement,
        onNextTurn: handleNextTurn,
        isDisabled: !isMyTurn
      }}
    />
  );
}
