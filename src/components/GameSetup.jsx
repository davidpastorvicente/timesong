import { useState } from 'react';
import { translations } from '../translations';
import { generateGameCode, createGameSession, checkGameExists, joinGameSession, getDeviceId, subscribeToGame } from '../services/gameSession';
import './GameSetup.css';

// Reusable component for song set selector
function SongSetSelector({ songSet, setSongSet, t }) {
  return (
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
  );
}

// Reusable component for winning score selector
function WinningScoreSelector({ winningScore, setWinningScore, t }) {
  return (
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
  );
}

export default function GameSetup({ onStartGame, language }) {
  const t = translations[language];
  
  const [gameMode, setGameMode] = useState(''); // 'single' or 'multi'
  const [multiplayerMode, setMultiplayerMode] = useState(''); // 'create', 'config', 'join', 'joined'
  const [gameCode, setGameCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [myTeamName, setMyTeamName] = useState('');
  const [hostTeamName, setHostTeamName] = useState(`${t.team || 'Team'} 1`);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [connectedTeams, setConnectedTeams] = useState([]);
  
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

  // Handle back navigation
  const handleBack = () => {
    if (multiplayerMode === 'joined' || multiplayerMode === 'join' || multiplayerMode === 'config' || multiplayerMode === 'create') {
      // Go back to multi device mode selection
      setMultiplayerMode('');
      setError('');
      setGameCode('');
      setJoinCode('');
    } else if (gameMode === 'single' || (gameMode === 'multi' && multiplayerMode === '')) {
      // Go back to game mode selection
      setGameMode('');
      setMultiplayerMode('');
    }
  };

  // Single device mode - same as before
  const handleStart = () => {
    onStartGame({
      mode: 'single',
      teamNames,
      winningScore,
      songSet
    });
  };

  // Create multiplayer game
  // Show host configuration before creating game
  const handleShowHostConfig = () => {
    setMultiplayerMode('config');
  };

  // Create multiplayer game with host settings
  const handleCreateGame = async () => {
    try {
      if (!hostTeamName.trim()) {
        setError(t.enterTeamName || 'Please enter your team name');
        return;
      }
      
      const code = generateGameCode();
      setGameCode(code);
      const deviceId = getDeviceId();
      
      // Initialize with host settings
      const gameSettings = {
        teamNames: [], // Teams join dynamically
        winningScore,
        songSet
      };
      
      await createGameSession(code, gameSettings);
      
      // Host joins as Team 1 immediately
      await joinGameSession(code, hostTeamName.trim(), deviceId);
      
      // Subscribe to game updates to see joining teams
      subscribeToGame(code, (gameData) => {
        if (gameData && gameData.teams) {
          setConnectedTeams(gameData.teams);
        }
      });
      
      setMultiplayerMode('create');
      setError('');
    } catch (err) {
      setError('Error creating game');
      console.error(err);
    }
  };

  // Join multiplayer game with team name
  const handleJoinGame = async () => {
    try {
      const code = joinCode.toUpperCase().trim();
      if (code.length !== 6) {
        setError(t.invalidGameCode);
        return;
      }
      
      if (!myTeamName.trim()) {
        setError(t.enterTeamName || 'Please enter your team name');
        return;
      }
      
      const exists = await checkGameExists(code);
      if (!exists) {
        setError(t.gameNotFound);
        return;
      }
      
      // Join as a new team
      const deviceId = getDeviceId();
      const teamIndex = await joinGameSession(code, myTeamName.trim(), deviceId);
      
      // Subscribe to game to wait for start
      subscribeToGame(code, (gameData) => {
        if (gameData && gameData.teams) {
          setConnectedTeams(gameData.teams);
        }
        
        // Check if game has started
        if (gameData && gameData.state && gameData.state.gamePhase === 'playing') {
          const finalTeamNames = gameData.teams.map(t => t.name);
          onStartGame({
            mode: 'multi',
            teamNames: finalTeamNames,
            winningScore: gameData.settings.winningScore,
            songSet: gameData.settings.songSet,
            gameCode: code,
            myTeamIndex: teamIndex,
            deviceId,
            isHost: false
          });
        }
      });
      
      setGameCode(code);
      setMultiplayerMode('joined');
      setError('');
    } catch (err) {
      setError('Error joining game');
      console.error(err);
    }
  };

  // Host starts the game
  const handleStartMultiplayerGame = () => {
    const deviceId = getDeviceId();
    
    // Host is already joined as Team 1 (index 0)
    // Just start the game
    onStartGame({
      mode: 'multi',
      teamNames: connectedTeams.map(t => t.name),
      winningScore,
      songSet,
      gameCode,
      myTeamIndex: 0, // Host is Team 1 (index 0)
      deviceId,
      isHost: true
    });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show game mode selector and setup
  if (gameMode === '' || (gameMode === 'single' && multiplayerMode === '') || (gameMode === 'multi' && (multiplayerMode === '' || multiplayerMode === 'config'))) {
    return (
      <div className="game-setup">
        <h1>{t.setupTitle}</h1>
        <p className="subtitle">{t.setupSubtitle}</p>
        
        <div className="setup-form">
          {/* Show back button on all screens except the initial game mode selection */}
          {gameMode !== '' && (
            <button className="back-button" title={t.back} onClick={handleBack}>
              ←
            </button>
          )}
          {/* Game Mode Selector */}
          {gameMode === '' && (
            <div className="form-group">
              <label>{t.gameMode}</label>
              <div className="mode-selector">
                <button
                  className="mode-button"
                  onClick={() => setGameMode('single')}
                >
                  📱 {t.singleDevice}
                </button>
                <button
                  className="mode-button"
                  onClick={() => setGameMode('multi')}
                >
                  📱📱 {t.multiDevice}
                </button>
              </div>
            </div>
          )}
          
          {/* Single Device Setup */}
          {gameMode === 'single' && (
            <>
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

              <WinningScoreSelector winningScore={winningScore} setWinningScore={setWinningScore} t={t} />

              <SongSetSelector songSet={songSet} setSongSet={setSongSet} t={t} />

              <button className="start-button" onClick={handleStart}>
                {t.startGameButton}
              </button>
            </>
          )}
          
          {/* Multi Device Mode - Create or Join */}
          {gameMode === 'multi' && multiplayerMode === '' && (
            <div className="form-group">
              <label>{t.multiplayerOptions || 'Choose an option'}</label>
              <div className="mode-selector">
                <button
                  className="mode-button"
                  onClick={handleShowHostConfig}
                >
                  🎮 {t.createGame}
                </button>
                <button
                  className="mode-button"
                  onClick={() => setMultiplayerMode('join')}
                >
                  🔗 {t.joinGame}
                </button>
              </div>
            </div>
          )}

          {/* Host Configuration */}
          {gameMode === 'multi' && multiplayerMode === 'config' && (
            <>
              <div className="form-group">
                <label>{t.hostTeamName || 'Your Team Name'}</label>
                <input
                  type="text"
                  placeholder={t.teamNamePlaceholder}
                  value={hostTeamName}
                  onChange={(e) => setHostTeamName(e.target.value)}
                  maxLength={20}
                />
              </div>

              <WinningScoreSelector winningScore={winningScore} setWinningScore={setWinningScore} t={t} />

              <SongSetSelector songSet={songSet} setSongSet={setSongSet} t={t} />

              {error && <p className="error">{error}</p>}

              <button className="start-button" onClick={handleCreateGame}>
                {t.createGameButton || t.createGame}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Show game code and waiting screen (host)
  if (multiplayerMode === 'create') {
    return (
      <div className="game-setup">
        <h1>{t.setupTitle}</h1>
        <div className="setup-form">
          <button className="back-button" title={t.back} onClick={handleBack}>
            ←
          </button>
          <div className="game-code-display">
            <h2>{t.gameCode}</h2>
            <div className="code">{gameCode}</div>
            <button className="copy-button" onClick={handleCopyCode}>
              {copied ? `✓ ${t.codeCopied}` : t.copyGameCode}
            </button>
          </div>
          
          <div className="players-status">
            <h3>{t.waitingForPlayers}</h3>
            <div className="team-list">
              {connectedTeams.length === 0 ? (
                <p className="waiting-message">{t.noPlayersYet || 'Waiting for players to join...'}</p>
              ) : (
                connectedTeams.map((team, index) => (
                  <div key={index} className="team-item connected">
                    <span>{team.name}</span>
                    <span className="status">✓</span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <button 
            className="start-button" 
            onClick={handleStartMultiplayerGame}
            disabled={connectedTeams.length < 2}
          >
            {t.startGameButton}
          </button>
        </div>
      </div>
    );
  }

  // Show join form (enter code + team name)
  if (multiplayerMode === 'join') {
    return (
      <div className="game-setup">
        <h1>{t.setupTitle}</h1>
        <div className="setup-form">
          <button className="back-button" title={t.back} onClick={handleBack}>
            ←
          </button>
          <div className="form-group">
            <label>{t.gameCodeLabel || 'Game Code'}</label>
            <input
              type="text"
              placeholder={t.gameCodePlaceholder}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="code-input"
            />
          </div>
          
          <div className="form-group">
            <label>{t.teamNameLabel || 'Your Team Name'}</label>
            <input
              type="text"
              placeholder={t.teamNamePlaceholder || 'Enter your team name'}
              value={myTeamName}
              onChange={(e) => setMyTeamName(e.target.value)}
              maxLength={20}
            />
          </div>
          
          {error && <p className="error">{error}</p>}
          
          <button className="start-button" onClick={handleJoinGame}>
            {t.joinGameButton}
          </button>
        </div>
      </div>
    );
  }

  // Waiting for host to start (after joining)
  if (multiplayerMode === 'joined') {
    return (
      <div className="game-setup">
        <h1>{t.setupTitle}</h1>
        <div className="setup-form">
          <button className="back-button" title={t.back} onClick={handleBack}>
            ←
          </button>
          <div className="game-code-display">
            <h3>{t.gameCode}</h3>
            <div className="code small">{gameCode}</div>
          </div>
          
          <div className="players-status">
            <h3>{t.waitingForHost || 'Waiting for host to start...'}</h3>
            <div className="team-list">
              {connectedTeams.map((team, index) => (
                <div key={index} className="team-item connected">
                  <span>{team.name}</span>
                  <span className="status">✓</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="loading-indicator">⏳</div>
        </div>
      </div>
    );
  }

  return null;
}
