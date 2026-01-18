import { useState } from 'react'
import GameSetup from './components/GameSetup'
import GameBoard from './components/GameBoard'
import LanguageSelector from './components/LanguageSelector'
import ThemeToggle from './components/ThemeToggle'
import './App.css'

function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [teams, setTeams] = useState([])
  const [winningScore, setWinningScore] = useState(10)
  const [language, setLanguage] = useState('es')
  const [songSet, setSongSet] = useState('everything')

  const handleStartGame = (teamNames, targetScore, selectedSongSet) => {
    setTeams(teamNames)
    setWinningScore(targetScore)
    setSongSet(selectedSongSet)
    setGameStarted(true)
  }

  return (
    <div className="app">
      <div className="top-controls">
        <LanguageSelector currentLanguage={language} onLanguageChange={setLanguage} />
        <ThemeToggle />
      </div>
      {!gameStarted ? (
        <GameSetup onStartGame={handleStartGame} language={language} />
      ) : (
        <GameBoard teams={teams} winningScore={winningScore} language={language} songSet={songSet} />
      )}
    </div>
  )
}

export default App
