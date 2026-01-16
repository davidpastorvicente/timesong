import { useState, useEffect, useCallback } from 'react';
import { songs } from '../data/songs';
import { translations } from '../translations';
import Timeline from './Timeline';
import SongPlayer from './SongPlayer';
import PlacementButtons from './PlacementButtons';
import './GameBoard.css';

// Function to fetch Deezer preview URL dynamically
async function fetchDeezerPreview(deezerId) {
  try {
    const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://api.deezer.com/track/${deezerId}`)}`);
    const data = await response.json();
    return data.preview || null;
  } catch (error) {
    console.error('Error fetching Deezer preview:', error);
    return null;
  }
}

export default function GameBoard({ teams, winningScore, language }) {
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

  const t = translations[language];

  const drawNewSong = useCallback(async (songs, usedIds) => {
    const availableToPlay = songs.filter(song => !usedIds.includes(song.youtubeId));

    if (availableToPlay.length === 0) {
      setGamePhase('gameOver');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableToPlay.length);
    const song = availableToPlay[randomIndex];

    // Fetch Deezer preview dynamically if deezerId exists
    let previewUrl;
    if (song.deezerId) {
      previewUrl = await fetchDeezerPreview(song.deezerId);
    }
    
    // Fallback to YouTube if no Deezer preview available
    if (!previewUrl) {
      previewUrl = `https://www.youtube.com/embed/${song.youtubeId}?autoplay=1&controls=0`;
    }

    setCurrentSong({ ...song, previewUrl });
    setUsedSongIds([...usedIds, song.youtubeId]);
    setGamePhase('playing');
    setLastPlacement(null);
  }, []);

  const loadSongs = useCallback(async () => {
    setAvailableSongs(songs);
    await drawNewSong(songs, []);
  }, [drawNewSong]);

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
    setCurrentTeamIndex(nextTeamIndex);
    await drawNewSong(availableSongs, usedSongIds);
  };

  const currentTeam = teams[currentTeamIndex];
  const currentTimeline = teamTimelines[currentTeamIndex];

  return (
    <div className="game-board">
      <div className="game-header">
        <h1>Hitster</h1>
        <div className="scores">
          {teams.map((team, index) => (
            <div 
              key={index} 
              className={`score ${index === currentTeamIndex ? 'active' : ''}`}
            >
              <span className="team-name">{team}</span>
              <span className="score-value">{scores[index]} / {winningScore} songs</span>
            </div>
          ))}
        </div>
      </div>

      {gamePhase === 'gameOver' && winner !== null && (
        <div className="game-over">
          <div className="winner-announcement">
            <h2>{t.gameOver}</h2>
            <h1>{teams[winner]} {t.winner}</h1>
            <p>They reached {winningScore} songs in their timeline!</p>
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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div className="current-turn">
              <h2>{currentTeam}</h2>
            </div>
          </div>

      {currentSong && gamePhase === 'playing' && (
        <div className="song-section">
          <SongPlayer song={currentSong} language={language} />
          <div className="timeline-container">
            <h3>{t.timeline}:</h3>
            <Timeline timeline={currentTimeline} showYears={true} language={language} />
            <PlacementButtons 
              timeline={currentTimeline}
              onPlacement={handlePlacement}
              language={language}
            />
          </div>
        </div>
      )}

      {gamePhase === 'result' && lastPlacement && (
        <div className="result-section">
          <div className={`result-message ${lastPlacement.correct ? 'correct' : 'incorrect'}`}>
            {lastPlacement.correct ? (
              <>
                <h2>{t.correct}</h2>
                <p>{t.correctPlacement}</p>
              </>
            ) : (
              <>
                <h2>{t.incorrect}</h2>
                <p><b>{currentSong.title}</b> {t.actualYear} <b>{currentSong.year}</b></p>
              </>
            )}
          </div>
          
          <div className="timeline-container">
            <h3>{currentTeam} {t.timeline}:</h3>
            <Timeline timeline={teamTimelines[currentTeamIndex]} showYears={true} language={language} />
          </div>

          <button className="next-turn-button" onClick={handleNextTurn}>
            {t.nextTurn}
          </button>
        </div>
      )}
      </>
      )}
    </div>
  );
}
