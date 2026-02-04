import { useState } from 'react'
import GameSetup from './components/GameSetup'
import MultiplayerGameBoard from './components/MultiplayerGameBoard'
import LanguageSelector from './components/LanguageSelector'
import ThemeToggle from './components/ThemeToggle'
import AuthGuard from './components/AuthGuard'
import './App.css'

function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [gameConfig, setGameConfig] = useState(null)
  const [turnIndicator, setTurnIndicator] = useState(null)
  
  // Initialize language from localStorage or default to 'es'
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('timesong_language') || 'es'
  })

  // Persist language preference
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage)
    localStorage.setItem('timesong_language', newLanguage)
  }

  const handleStartGame = (config) => {
    // Config contains: mode, teamNames, winningScore, songSet
    // For multiplayer: also gameCode, myTeamIndex, deviceId, isHost
    setGameConfig(config)
    setGameStarted(true)
  }

  return (
    <AuthGuard language={language} onLanguageChange={handleLanguageChange}>
      <div className="app">
        <div className="top-controls">
          {turnIndicator}
          <div className="top-controls-right">
            <LanguageSelector currentLanguage={language} onLanguageChange={handleLanguageChange} />
            <ThemeToggle />
          </div>
        </div>
        {!gameStarted ? (
          <GameSetup onStartGame={handleStartGame} language={language} />
        ) : (
          <MultiplayerGameBoard 
            gameConfig={gameConfig}
            language={language}
            onTurnIndicatorChange={setTurnIndicator}
          />
        )}
      </div>
    </AuthGuard>
  )
}

export default App
