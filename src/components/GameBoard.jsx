import { useState, useEffect, useCallback } from 'react';
import { songSets } from '../data/songs';
import { translations } from '../translations';
import Timeline from './Timeline';
import SongPlayer from './SongPlayer';
import PlacementButtons from './PlacementButtons';
import './GameBoard.css';

// Function to fetch Deezer preview URL and album cover dynamically
async function fetchDeezerData(deezerId) {
  try {
    const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://api.deezer.com/track/${deezerId}`)}`);
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

export default function GameBoard({ teams, winningScore, language, songSet }) {
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [currentSong, setCurrentSong] = useState(null);
  const [teamTimelines, setTeamTimelines] = useState(
    teams.map(() => [])
  );
  const [availableSongs, setAvailableSongs] = useState([]);
  const [usedSongIds, setUsedSongIds] = useState([]);
  const [gamePhase, setGamePhase] = useState('playing');
  const [lastPlacement, setLastPlacement] = useState(null);
  const [scores, setScores] = useState(teams.map(() => 0));
  const [winner, setWinner] = useState(null);
  const [animationKey, setAnimationKey] = useState(0);

  const t = translations[language];

  const drawNewSong = useCallback(async (songs, usedIds) => {
    const availableToPlay = songs.filter(song => !usedIds.includes(song.youtubeId));

    if (availableToPlay.length === 0) {
      setGamePhase('gameOver');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableToPlay.length);
    const song = availableToPlay[randomIndex];

    // Fetch Deezer data dynamically if deezerId exists
    let previewUrl;
    let albumCover;
    if (song.deezerId) {
      const deezerData = await fetchDeezerData(song.deezerId);
      previewUrl = deezerData.previewUrl;
      albumCover = deezerData.albumCover;
    }
    
    // Fallback to YouTube if no Deezer preview available
    if (!previewUrl) {
      previewUrl = `https://www.youtube.com/embed/${song.youtubeId}?autoplay=1&controls=0`;
    }

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSongs();
  }, [loadSongs]);

  const handlePlacement = (position) => {
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
    const nextTeamIndex = (currentTeamIndex + 1) % teams.length;
    setAnimationKey(prev => prev + 1); // Trigger re-render for animation
    setCurrentTeamIndex(nextTeamIndex);
    await drawNewSong(availableSongs, usedSongIds);
  };

  const currentTimeline = teamTimelines[currentTeamIndex];
  return (
    <div className="game-board">
      <div className="game-header">
        <h1>Hitster</h1>
      </div>

      {gamePhase === 'gameOver' && winner !== null && (
        <div className="game-over">
          <div className="winner-announcement">
            <h2>🎉 {t.gameOver} 🎉</h2>
            <h1>{t.winner}: {teams[winner]}</h1>
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
                  <PlacementButtons 
                    timeline={currentTimeline}
                    onPlacement={handlePlacement}
                    language={language}
                  />
                </>
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
                  <button className="next-turn-button" onClick={handleNextTurn}>
                    {t.nextTurn}
                  </button>
                </>
              )}
            </div>

            {/* Right side: All Team Timelines */}
            <div className="timelines-section" key={animationKey}>
              <h3>{t.timeline}s:</h3>
              {/* Reorder teams to put current team first */}
              {[...Array(teams.length)].map((_, offset) => {
                const index = (currentTeamIndex + offset) % teams.length;
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
                      <h4>{teams[index]}</h4>
                      <span className="team-score">{scores[index]} / {winningScore}</span>
                    </div>
                    <Timeline 
                      timeline={teamTimelines[index]} 
                      showYears={true} 
                      language={language} 
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
