import { useState, useEffect, useCallback } from 'react';
import { songSets } from '../data/songs';
import { movieSets } from '../data/movies';
import { translations } from '../translations';
import { fetchDeezerPreview } from '../utils/deezer';
import Timeline from './Timeline';
import MediaPlayer from './MediaPlayer';
import PlacementButtons from './PlacementButtons';
import { useTheme } from '../hooks/useTheme';
import './GameBoard.css';

export default function GameBoard({ gameConfig, language, overrideState }) {
  // Extract config - handle both single and multiplayer mode
  const { category, playerNames, winningScore, contentSet, mode, myPlayerIndex } = gameConfig;
  
  // Get current theme
  const theme = useTheme();
  
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(overrideState?.currentPlayerIndex ?? 0);
  const [currentItem, setCurrentItem] = useState(overrideState?.currentItem ?? null);
  const [playerTimelines, setPlayerTimelines] = useState(
    overrideState?.playerTimelines ?? playerNames.map(() => [])
  );
  const [availableItems, setAvailableItems] = useState([]);
  const [usedItemIds, setUsedItemIds] = useState([]);
  const [gamePhase, setGamePhase] = useState(overrideState?.gamePhase ?? 'playing');
  const [lastPlacement, setLastPlacement] = useState(overrideState?.lastPlacement ?? null);
  const [scores, setScores] = useState(overrideState?.scores ?? playerNames.map(() => 0));
  const [winner, setWinner] = useState(overrideState?.winner ?? null);
  const [animationKey, setAnimationKey] = useState(0);
  
  // Check if interactions should be disabled (for multiplayer waiting)
  const isDisabled = overrideState?.isDisabled ?? false;
  
  // Get the actual current player index from overrideState if available
  const actualCurrentPlayerIndex = overrideState?.actualCurrentPlayerIndex ?? currentPlayerIndex;

  const t = translations[language];
  
  // Use overrides if provided (multiplayer mode)
  // This synchronizes Firebase state to local state for multiplayer
  useEffect(() => {
    if (overrideState) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (overrideState.currentItem) setCurrentItem(overrideState.currentItem);
      if (overrideState.playerTimelines) setPlayerTimelines(overrideState.playerTimelines);
      if (overrideState.scores) setScores(overrideState.scores);
      if (overrideState.gamePhase) setGamePhase(overrideState.gamePhase);
      if (overrideState.lastPlacement !== undefined) setLastPlacement(overrideState.lastPlacement);
      if (overrideState.currentPlayerIndex !== undefined) setCurrentPlayerIndex(overrideState.currentPlayerIndex);
      if (overrideState.winner !== undefined) setWinner(overrideState.winner);
    }
  }, [overrideState]);

  const drawNewItem = useCallback(async (media, usedIds) => {
    // Get the appropriate ID field based on category
    const idField = category === 'songs' ? 'youtubeId' : 'tmdbId';
    const availableToPlay = media.filter(item => !usedIds.includes(item[idField]));

    if (availableToPlay.length === 0) {
      setGamePhase('gameOver');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableToPlay.length);
    const item = availableToPlay[randomIndex];

    let enrichedItem = { ...item };
    
    // For songs, fetch Deezer preview URL at runtime (they expire after ~24h)
    if (category === 'songs') {
      const { previewUrl, albumCover } = await fetchDeezerPreview(item);
      enrichedItem = { ...item, previewUrl, albumCover };
    }
    // For movies, backdrop URL is already in the data

    setCurrentItem(enrichedItem);
    setUsedItemIds([...usedIds, item[idField]]);
    setGamePhase('playing');
    setLastPlacement(null);
  }, [category]);

  const loadMedia = useCallback(async () => {
    let selectedMedia;
    if (category === 'songs') {
      selectedMedia = songSets[contentSet]?.songs || songSets.everything.songs;
    } else if (category === 'movies') {
      selectedMedia = movieSets[contentSet]?.movies || movieSets.everything.movies;
    }
    setAvailableItems(selectedMedia);
    await drawNewItem(selectedMedia, []);
  }, [drawNewItem, contentSet, category]);

  useEffect(() => {
    // Only initialize media in single-device mode
    if (!overrideState) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadMedia();
    }
  }, [loadMedia, overrideState]);

  const handlePlacement = (position) => {
    // Use override callback if provided (multiplayer mode)
    if (overrideState?.onPlacement) {
      overrideState.onPlacement(position);
      return;
    }
    
    // Single-device mode logic
    const currentTimeline = playerTimelines[currentPlayerIndex];
    const newTimeline = [...currentTimeline];
    
    newTimeline.splice(position, 0, currentItem);
    
    const isCorrect = checkIfCorrectPlacement(newTimeline);
    
    if (isCorrect) {
      const updatedTimelines = [...playerTimelines];
      updatedTimelines[currentPlayerIndex] = newTimeline;
      setPlayerTimelines(updatedTimelines);
      
      const newScores = [...scores];
      newScores[currentPlayerIndex]++;
      setScores(newScores);
      
      setLastPlacement({ correct: true, position });
      
      if (newScores[currentPlayerIndex] >= winningScore) {
        setWinner(currentPlayerIndex);
        setGamePhase('gameOver');
        return;
      }
    } else {
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
    // Use override callback if provided (multiplayer mode)
    if (overrideState?.onNextTurn) {
      overrideState.onNextTurn();
      return;
    }
    
    // Single-device mode logic
    // Set to loading state first to prevent flickering
    setGamePhase('loading');
    setAnimationKey(prev => prev + 1); // Trigger re-render for animation
    
    const nextPlayerIndex = (currentPlayerIndex + 1) % playerNames.length;
    setCurrentPlayerIndex(nextPlayerIndex);
    await drawNewItem(availableItems, usedItemIds);
  };

  const currentTimeline = playerTimelines[currentPlayerIndex];
  return (
    <div className="game-board">
      <div className="game-header">
        <h1>
          <img src={import.meta.env.BASE_URL + (theme === 'dark' ? 'logo-dark.svg' : 'logo.svg')} alt="ChronoTunes" className="title-logo" />
          ChronoTunes
        </h1>
      </div>

      {gamePhase === 'gameOver' && winner !== null && (
        <div className="game-over">
          <div className="winner-announcement">
            <h2>🎉 {t.gameOver} 🎉</h2>
            <h1>{t.winner}: {playerNames[winner]}</h1>
            <div className="final-timeline">
              <h3>{t.finalTimeline}</h3>
              <Timeline timeline={playerTimelines[winner]} language={language} playerId={winner} category={category} />
            </div>
            <button className="play-again-button" onClick={() => window.location.reload()}>
              {t.playAgain}
            </button>
          </div>
        </div>
      )}

      {gamePhase !== 'gameOver' && (
        <>
          <div className="game-content">
            {/* Left side: Media Player and Placement Buttons */}
            <div className="item-section">
              {currentItem && gamePhase === 'playing' && (
                <>
                  <MediaPlayer 
                    category={category}
                    media={currentItem}
                    language={language}
                  />
                  {!isDisabled && (
                    <PlacementButtons 
                      timeline={currentTimeline}
                      onPlacement={handlePlacement}
                      language={language}
                    />
                  )}
                </>
              )}
              
              {gamePhase === 'loading' && (
                <div style={{ 
                  padding: '4rem', 
                  textAlign: 'center', 
                  color: 'var(--text-secondary)' 
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎵</div>
                  <div>{t.loading}</div>
                </div>
              )}
              
              {gamePhase === 'result' && lastPlacement && (
                <>
                  <div className={`result-message ${lastPlacement.correct ? 'correct' : 'incorrect'}`}>
                    <div className="result-icon">
                      {lastPlacement.correct ? '✓' : '✗'}
                    </div>
                    {category === 'songs' && currentItem.albumCover && (
                      <div className="result-cover">
                        <img src={currentItem.albumCover} alt="Album cover" />
                      </div>
                    )}
                    {category === 'movies' && currentItem.posterUrl && (
                      <div className="result-cover">
                        <img src={currentItem.posterUrl} alt="Movie poster" />
                      </div>
                    )}
                    <div className="result-content">
                      <div className="item-details">
                        <div className="item-title">{currentItem.title}</div>
                        {category === 'songs' && currentItem.artist && (
                          <div className="item-subtitle">{currentItem.artist}</div>
                        )}
                        {category === 'movies' && currentItem.type && (
                          <div className="item-subtitle">
                            {currentItem.type === 'movie' ? t.movie : t.tvShow}
                          </div>
                        )}
                        <div className="item-year">{currentItem.year}</div>
                      </div>
                    </div>
                  </div>
                  {!isDisabled && (
                    <button 
                      className="next-turn-button" 
                      onClick={handleNextTurn}
                    >
                      {t.nextTurn}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Right side: All Player Timelines */}
            <div className="timelines-section" key={animationKey}>
              <h3>{t.timeline}s:</h3>
              {/* In multiplayer, keep my player on top; in single-device, reorder to show current player first */}
              {mode === 'multi' && myPlayerIndex !== null && myPlayerIndex !== undefined ? (
                // Multiplayer mode: My player first, then others
                playerNames.map((_, index) => {
                  // Calculate display order: my player first, then others in sequence
                  const displayIndex = index === myPlayerIndex ? 0 : (index < myPlayerIndex ? index + 1 : index);
                  return (
                    <div 
                      key={`${animationKey}-${index}`}
                      className={`player-timeline-container ${index === actualCurrentPlayerIndex ? 'active' : ''}`}
                      style={{ 
                        animationDelay: `${displayIndex * 0.1}s`,
                        order: displayIndex
                      }}
                    >
                      <div className="player-timeline-header">
                        <h4>{playerNames[index]}</h4>
                        <span className="player-score">{scores[index]} / {winningScore}</span>
                      </div>
                      <Timeline 
                        timeline={playerTimelines[index]}
                        language={language}
                        playerId={index}
                        category={category}
                      />
                    </div>
                  );
                })
              ) : (
                // Single-device mode: Reorder to put current player first
                [...Array(playerNames.length)].map((_, offset) => {
                  const index = (currentPlayerIndex + offset) % playerNames.length;
                  return (
                    <div 
                      key={`${animationKey}-${index}`}
                      className={`player-timeline-container ${index === currentPlayerIndex ? 'active' : ''}`}
                      style={{ 
                        animationDelay: `${offset * 0.1}s`,
                        order: offset
                      }}
                    >
                      <div className="player-timeline-header">
                        <h4>{playerNames[index]}</h4>
                        <span className="player-score">{scores[index]} / {winningScore}</span>
                      </div>
                      <Timeline 
                        timeline={playerTimelines[index]}
                        language={language}
                        playerId={index}
                        category={category}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
