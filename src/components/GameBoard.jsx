import { useState, useEffect, useCallback } from 'react';
import { songSets } from '../data/songs';
import { translations } from '../translations';
import { fetchDeezerPreview } from '../utils/deezer';
import Timeline from './Timeline';
import SongPlayer from './SongPlayer';
import PlacementButtons from './PlacementButtons';
import './GameBoard.css';

export default function GameBoard({ gameConfig, language, overrideState }) {
  // Extract config - handle both single and multiplayer mode
  const { teamNames, winningScore, songSet, mode, myTeamIndex } = gameConfig;
  
  const [currentTeamIndex, setCurrentTeamIndex] = useState(overrideState?.currentTeamIndex ?? 0);
  const [currentSong, setCurrentSong] = useState(overrideState?.currentSong ?? null);
  const [teamTimelines, setTeamTimelines] = useState(
    overrideState?.teamTimelines ?? teamNames.map(() => [])
  );
  const [availableSongs, setAvailableSongs] = useState([]);
  const [usedSongIds, setUsedSongIds] = useState([]);
  const [gamePhase, setGamePhase] = useState(overrideState?.gamePhase ?? 'playing');
  const [lastPlacement, setLastPlacement] = useState(overrideState?.lastPlacement ?? null);
  const [scores, setScores] = useState(overrideState?.scores ?? teamNames.map(() => 0));
  const [winner, setWinner] = useState(overrideState?.winner ?? null);
  const [animationKey, setAnimationKey] = useState(0);
  
  // Check if interactions should be disabled (for multiplayer waiting)
  const isDisabled = overrideState?.isDisabled ?? false;
  
  // Get the actual current team index from overrideState if available
  const actualCurrentTeamIndex = overrideState?.actualCurrentTeamIndex ?? currentTeamIndex;

  const t = translations[language];
  
  // Use overrides if provided (multiplayer mode)
  // This synchronizes Firebase state to local state for multiplayer
  useEffect(() => {
    if (overrideState) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (overrideState.currentSong) setCurrentSong(overrideState.currentSong);
      if (overrideState.teamTimelines) setTeamTimelines(overrideState.teamTimelines);
      if (overrideState.scores) setScores(overrideState.scores);
      if (overrideState.gamePhase) setGamePhase(overrideState.gamePhase);
      if (overrideState.lastPlacement !== undefined) setLastPlacement(overrideState.lastPlacement);
      if (overrideState.currentTeamIndex !== undefined) setCurrentTeamIndex(overrideState.currentTeamIndex);
      if (overrideState.winner !== undefined) setWinner(overrideState.winner);
    }
  }, [overrideState]);

  const drawNewSong = useCallback(async (songs, usedIds) => {
    const availableToPlay = songs.filter(song => !usedIds.includes(song.youtubeId));

    if (availableToPlay.length === 0) {
      setGamePhase('gameOver');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableToPlay.length);
    const song = availableToPlay[randomIndex];

    // Fetch Deezer preview URL at runtime (they expire after ~24h)
    const { previewUrl, albumCover } = await fetchDeezerPreview(song);

    setCurrentSong({ ...song, previewUrl, albumCover });
    setUsedSongIds([...usedIds, song.youtubeId]);
    setGamePhase('playing');
    setLastPlacement(null);
  }, []);

  const loadSongs = useCallback(async () => {
    const selectedSongs = songSets[songSet]?.songs || songSets.everything.songs;
    setAvailableSongs(selectedSongs);
    await drawNewSong(selectedSongs, []);
  }, [drawNewSong, songSet]);

  useEffect(() => {
    // Only initialize songs in single-device mode
    if (!overrideState) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadSongs();
    }
  }, [loadSongs, overrideState]);

  const handlePlacement = (position) => {
    // Use override callback if provided (multiplayer mode)
    if (overrideState?.onPlacement) {
      overrideState.onPlacement(position);
      return;
    }
    
    // Single-device mode logic
    const currentTimeline = teamTimelines[currentTeamIndex];
    const newTimeline = [...currentTimeline];
    
    newTimeline.splice(position, 0, currentSong);
    
    const isCorrect = checkIfCorrectPlacement(newTimeline);
    
    if (isCorrect) {
      const updatedTimelines = [...teamTimelines];
      updatedTimelines[currentTeamIndex] = newTimeline;
      setTeamTimelines(updatedTimelines);
      
      const newScores = [...scores];
      newScores[currentTeamIndex]++;
      setScores(newScores);
      
      setLastPlacement({ correct: true, position });
      
      if (newScores[currentTeamIndex] >= winningScore) {
        setWinner(currentTeamIndex);
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
    
    const nextTeamIndex = (currentTeamIndex + 1) % teamNames.length;
    setCurrentTeamIndex(nextTeamIndex);
    await drawNewSong(availableSongs, usedSongIds);
  };

  const currentTimeline = teamTimelines[currentTeamIndex];
  return (
    <div className="game-board">
      <div className="game-header">
        <h1>
          <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="ChronoTunes" className="title-logo" />
          ChronoTunes
        </h1>
      </div>

      {gamePhase === 'gameOver' && winner !== null && (
        <div className="game-over">
          <div className="winner-announcement">
            <h2>🎉 {t.gameOver} 🎉</h2>
            <h1>{t.winner}: {teamNames[winner]}</h1>
            <div className="final-timeline">
              <h3>{t.finalTimeline}</h3>
              <Timeline timeline={teamTimelines[winner]} showYears={true} language={language} />
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
            {/* Left side: Song Player and Placement Buttons */}
            <div className="song-section">
              {currentSong && gamePhase === 'playing' && (
                <>
                  <SongPlayer song={currentSong} language={language} />
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
                  <div>{t.loadingNextSong }</div>
                </div>
              )}
              
              {gamePhase === 'result' && lastPlacement && (
                <>
                  <div className={`result-message ${lastPlacement.correct ? 'correct' : 'incorrect'}`}>
                    {currentSong.albumCover && (
                      <div className="result-album-cover">
                        <img src={currentSong.albumCover} alt="Album cover" />
                      </div>
                    )}
                    <div className="result-content">
                      <div className="song-details">
                        <div className="song-detail-title">{currentSong.title}</div>
                        <div className="song-detail-artist">{currentSong.artist}</div>
                        <div className="song-detail-year">{currentSong.year}</div>
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

            {/* Right side: All Team Timelines */}
            <div className="timelines-section" key={animationKey}>
              <h3>{t.timeline}s:</h3>
              {/* In multiplayer, keep my team on top; in single-device, reorder to show current team first */}
              {mode === 'multi' && myTeamIndex !== null && myTeamIndex !== undefined ? (
                // Multiplayer mode: My team first, then others
                teamNames.map((_, index) => {
                  // Calculate display order: my team first, then others in sequence
                  const displayIndex = index === myTeamIndex ? 0 : (index < myTeamIndex ? index + 1 : index);
                  return (
                    <div 
                      key={`${animationKey}-${index}`}
                      className={`team-timeline-container ${index === actualCurrentTeamIndex ? 'active' : ''}`}
                      style={{ 
                        animationDelay: `${displayIndex * 0.1}s`,
                        order: displayIndex
                      }}
                    >
                      <div className="team-timeline-header">
                        <h4>{teamNames[index]}</h4>
                        <span className="team-score">{scores[index]} / {winningScore}</span>
                      </div>
                      <Timeline 
                        timeline={teamTimelines[index]} 
                        showYears={true} 
                        language={language} 
                      />
                    </div>
                  );
                })
              ) : (
                // Single-device mode: Reorder to put current team first
                [...Array(teamNames.length)].map((_, offset) => {
                  const index = (currentTeamIndex + offset) % teamNames.length;
                  return (
                    <div 
                      key={`${animationKey}-${index}`}
                      className={`team-timeline-container ${index === currentTeamIndex ? 'active' : ''}`}
                      style={{ 
                        animationDelay: `${offset * 0.1}s`,
                        order: offset
                      }}
                    >
                      <div className="team-timeline-header">
                        <h4>{teamNames[index]}</h4>
                        <span className="team-score">{scores[index]} / {winningScore}</span>
                      </div>
                      <Timeline 
                        timeline={teamTimelines[index]} 
                        showYears={true} 
                        language={language} 
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
