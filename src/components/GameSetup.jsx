import { useState } from 'react';
import { translations } from '../translations';
import { generateGameCode, createGameSession, checkGameExists, joinGameSession, getDeviceId, subscribeToGame } from '../services/gameSession';
import { useTheme } from '../hooks/useTheme';
import './GameSetup.css';

// Reusable component for category selector
function CategorySelector({ category, setCategory, t }) {
  return (
    <div className="form-group">
      <label>{t.categoryLabel}</label>
      <div className="player-selector">
        <button
          className={category === 'songs' ? 'active' : ''}
          onClick={() => setCategory('songs')}
        >
          🎵 {t.categorySongs}
        </button>
        <button
          className={category === 'movies' ? 'active' : ''}
          onClick={() => setCategory('movies')}
        >
          🎬 {t.categoryMovies}
        </button>
      </div>
    </div>
  );
}

// Reusable component for content set selector
function ContentSetSelector({ contentSet, setContentSet, t }) {
  return (
    <div className="form-group">
      <label>{t.contentSetLabel}</label>
      <div className="player-selector">
        <button
          className={contentSet === 'everything' ? 'active' : ''}
          onClick={() => setContentSet('everything')}
        >
          {t.contentSetEverything}
        </button>
        <button
          className={contentSet === 'english' ? 'active' : ''}
          onClick={() => setContentSet('english')}
        >
          {t.contentSetEnglish}
        </button>
        <button
          className={contentSet === 'spanish' ? 'active' : ''}
          onClick={() => setContentSet('spanish')}
        >
          {t.contentSetSpanish}
        </button>
        <button
          className={contentSet === 'new' ? 'active' : ''}
          onClick={() => setContentSet('new')}
        >
          {t.contentSetNew}
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
      <div className="player-selector">
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
  
  // Get current theme
  const theme = useTheme();
  
  const [gameMode, setGameMode] = useState(''); // 'single' or 'multi'
  const [multiplayerMode, setMultiplayerMode] = useState(''); // 'create', 'config', 'join', 'joined'
  const [gameCode, setGameCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [myPlayerName, setMyPlayerName] = useState('');
  const [hostPlayerName, setHostPlayerName] = useState(`${t.player} 1`);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  
  const [category, setCategory] = useState('songs');
  const [numPlayers, setNumPlayers] = useState(2);
  const [playerNames, setPlayerNames] = useState([`${t.player} 1`, `${t.player} 2`]);
  const [winningScore, setWinningScore] = useState(10);
  const [contentSet, setContentSet] = useState('everything');

  const handleNumPlayersChange = (num) => {
    setNumPlayers(num);
    const newPlayerNames = Array.from({ length: num }, (_, i) => 
      playerNames[i] || `${t.player} ${i + 1}`
    );
    setPlayerNames(newPlayerNames);
  };

  const handlePlayerNameChange = (index, name) => {
    const newPlayerNames = [...playerNames];
    newPlayerNames[index] = name;
    setPlayerNames(newPlayerNames);
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
      category,
      playerNames,
      winningScore,
      contentSet
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
      if (!hostPlayerName.trim()) {
        setError(t.playerNamePlaceholder);
        return;
      }
      
      const code = generateGameCode();
      setGameCode(code);
      const deviceId = getDeviceId();
      
      // Initialize with host settings
      const gameSettings = {
        category,
        playerNames: [], // Players join dynamically
        winningScore,
        contentSet
      };
      
      await createGameSession(code, gameSettings);
      
      // Host joins as Player 1 immediately
      await joinGameSession(code, hostPlayerName.trim(), deviceId);
      
      // Subscribe to game updates to see joining players
      subscribeToGame(code, (gameData) => {
        if (gameData && gameData.players) {
          setConnectedPlayers(gameData.players);
        }
      });
      
      setMultiplayerMode('create');
      setError('');
    } catch (err) {
      setError('Error creating game');
      console.error(err);
    }
  };

  // Join multiplayer game with player name
  const handleJoinGame = async () => {
    try {
      const code = joinCode.toUpperCase().trim();
      if (code.length !== 6) {
        setError(t.invalidGameCode);
        return;
      }
      
      if (!myPlayerName.trim()) {
        setError(t.playerNamePlaceholder);
        return;
      }
      
      const exists = await checkGameExists(code);
      if (!exists) {
        setError(t.gameNotFound);
        return;
      }
      
      // Join as a new player
      const deviceId = getDeviceId();
      const playerIndex = await joinGameSession(code, myPlayerName.trim(), deviceId);
      
      // Subscribe to game to wait for start
      subscribeToGame(code, (gameData) => {
        if (gameData && gameData.players) {
          setConnectedPlayers(gameData.players);
        }
        
        // Check if game has started
        if (gameData && gameData.state && gameData.state.gamePhase === 'playing') {
          const finalPlayerNames = gameData.players.map(t => t.name);
          onStartGame({
            mode: 'multi',
            category: gameData.settings.category,
            playerNames: finalPlayerNames,
            winningScore: gameData.settings.winningScore,
            contentSet: gameData.settings.contentSet,
            gameCode: code,
            myPlayerIndex: playerIndex,
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
    
    // Host is already joined as Player 1 (index 0)
    // Just start the game
    onStartGame({
      mode: 'multi',
      category,
      playerNames: connectedPlayers.map(t => t.name),
      winningScore,
      contentSet,
      gameCode,
      myPlayerIndex: 0, // Host is Player 1 (index 0)
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
        <h1>
          <img src={import.meta.env.BASE_URL + (theme === 'dark' ? 'logo-dark.svg' : 'logo.svg')} alt="ChronoTunes" className="title-logo" />
          {t.setupTitle}
        </h1>
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
              <CategorySelector category={category} setCategory={setCategory} t={t} />
              
              <div className="form-group">
                <label>{t.playersNumber}</label>
                <div className="player-selector">
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <button
                      key={num}
                      className={numPlayers === num ? 'active' : ''}
                      onClick={() => handleNumPlayersChange(num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>{t.playerNames}</label>
                <div className="player-names">
                  {playerNames.map((name, index) => (
                    <input
                      key={index}
                      type="text"
                      value={name}
                      onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                    />
                  ))}
                </div>
              </div>

              <WinningScoreSelector winningScore={winningScore} setWinningScore={setWinningScore} t={t} />

              <ContentSetSelector contentSet={contentSet} setContentSet={setContentSet} t={t} />

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
              <CategorySelector category={category} setCategory={setCategory} t={t} />
              
              <div className="form-group">
                <label>{t.playerNameLabel}</label>
                <input
                  type="text"
                  placeholder={t.playerNamePlaceholder}
                  value={hostPlayerName}
                  onChange={(e) => setHostPlayerName(e.target.value)}
                  maxLength={20}
                />
              </div>

              <WinningScoreSelector winningScore={winningScore} setWinningScore={setWinningScore} t={t} />

              <ContentSetSelector contentSet={contentSet} setContentSet={setContentSet} t={t} />

              {error && <p className="error">{error}</p>}

              <button className="start-button" onClick={handleCreateGame}>
                {t.createGame}
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
            <div className="player-list">
              {connectedPlayers.length === 0 ? (
                <p className="waiting-message">{t.waitingForPlayers}</p>
              ) : (
                connectedPlayers.map((player, index) => (
                  <div key={index} className="player-item connected">
                    <span>{player.name}</span>
                    <span className="status">✓</span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <button 
            className="start-button" 
            onClick={handleStartMultiplayerGame}
            disabled={connectedPlayers.length < 2}
          >
            {t.startGameButton}
          </button>
        </div>
      </div>
    );
  }

  // Show join form (enter code + player name)
  if (multiplayerMode === 'join') {
    return (
      <div className="game-setup">
        <h1>{t.setupTitle}</h1>
        <div className="setup-form">
          <button className="back-button" title={t.back} onClick={handleBack}>
            ←
          </button>
          <div className="form-group">
            <label>{t.gameCodeLabel}</label>
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
            <label>{t.playerNameLabel}</label>
            <input
              type="text"
              placeholder={t.playerNamePlaceholder}
              value={myPlayerName}
              onChange={(e) => setMyPlayerName(e.target.value)}
              maxLength={20}
            />
          </div>
          
          {error && <p className="error">{error}</p>}
          
          <button className="start-button" onClick={handleJoinGame}>
            {t.joinGame}
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
            <div className="player-list">
              {connectedPlayers.map((player, index) => (
                <div key={index} className="player-item connected">
                  <span>{player.name}</span>
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
