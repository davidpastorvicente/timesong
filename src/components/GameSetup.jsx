import { useState } from 'react';
import { translations } from '../translations';
import './GameSetup.css';

export default function GameSetup({ onStartGame, language }) {
  const t = translations[language];
  
  const [numTeams, setNumTeams] = useState(2);
  const [teamNames, setTeamNames] = useState([`${t.team} 1`, `${t.team} 2`]);
  const [winningScore, setWinningScore] = useState(10);
  const [songSet, setSongSet] = useState('everything');

  const handleNumTeamsChange = (num) => {
    setNumTeams(num);
    const newTeamNames = Array.from({ length: num }, (_, i) => 
      teamNames[i] || `${t.team} ${i + 1}`
    );
    setTeamNames(newTeamNames);
  };

  const handleTeamNameChange = (index, name) => {
    const newTeamNames = [...teamNames];
    newTeamNames[index] = name;
    setTeamNames(newTeamNames);
  };

  const handleStart = () => {
    onStartGame(teamNames, winningScore, songSet);
  };

  return (
    <div className="game-setup">
      <h1>{t.setupTitle}</h1>
      <p className="subtitle">{t.setupSubtitle}</p>
      
      <div className="setup-form">
        <div className="form-group">
          <label>{t.teamsNumber}</label>
          <div className="team-selector">
            {[2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                className={numTeams === num ? 'active' : ''}
                onClick={() => handleNumTeamsChange(num)}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>{t.teamNames}</label>
          <div className="team-names">
            {teamNames.map((name, index) => (
              <input
                key={index}
                type="text"
                value={name}
                onChange={(e) => handleTeamNameChange(index, e.target.value)}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>{t.winningScoreLabel}</label>
          <div className="team-selector">
            {[5, 10, 15, 20].map(num => (
              <button
                key={num}
                className={winningScore === num ? 'active' : ''}
                onClick={() => setWinningScore(num)}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>{t.songSetLabel}</label>
          <div className="team-selector">
            <button
              className={songSet === 'everything' ? 'active' : ''}
              onClick={() => setSongSet('everything')}
            >
              {t.songSetEverything}
            </button>
            <button
              className={songSet === 'english' ? 'active' : ''}
              onClick={() => setSongSet('english')}
            >
              {t.songSetEnglish}
            </button>
            <button
              className={songSet === 'spanish' ? 'active' : ''}
              onClick={() => setSongSet('spanish')}
            >
              {t.songSetSpanish}
            </button>
            <button
              className={songSet === 'new' ? 'active' : ''}
              onClick={() => setSongSet('new')}
            >
              {t.songSetNew}
            </button>
          </div>
        </div>

        <button className="start-button" onClick={handleStart}>
          {t.startGameButton}
        </button>
      </div>
    </div>
  );
}
