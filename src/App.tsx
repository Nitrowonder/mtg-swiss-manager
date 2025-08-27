import { useState, useEffect } from 'react'
import type { Player, Pairing, TournamentData, ResultType } from './types'
import { 
  parsePlayerScore, 
  exportTournamentData, 
  validateTournamentData, 
  areAllMatchesReported,
  calculatePlayerRecords
} from './utils'
import { generateSwissPairings } from './swissPairing'
import { PlayerList, PairingItem, TournamentControls, FinalStandings } from './components'
import './App.css'

function App() {
  const [players, setPlayers] = useState<Player[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerScore, setNewPlayerScore] = useState('')
  const [allPairings, setAllPairings] = useState<Pairing[]>([])
  const [currentRound, setCurrentRound] = useState(1)
  const [maxRounds, setMaxRounds] = useState(4)

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('mtg-swiss-manager-tournament')
    if (savedData) {
      const tournamentData: TournamentData = JSON.parse(savedData)
      setPlayers(tournamentData.players)
      setAllPairings(tournamentData.allPairings)
      setCurrentRound(tournamentData.currentRound)
      setMaxRounds(tournamentData.maxRounds || 4) // Default to 4 for backwards compatibility
    }
  }, [])

  // Save data to localStorage whenever state changes
  useEffect(() => {
    const tournamentData: TournamentData = {
      players,
      allPairings,
      currentRound,
      maxRounds
    }
    localStorage.setItem('mtg-swiss-manager-tournament', JSON.stringify(tournamentData))
  }, [players, allPairings, currentRound, maxRounds])

  const addPlayer = () => {
    if (newPlayerName.trim() === '') return
    
    // Parse score if provided (format: "2-1-0" or "2-1" for W-L-D or W-L)
    const { wins, losses, draws } = parsePlayerScore(newPlayerScore)
    
    const newPlayer: Player = {
      id: Date.now().toString(),
      name: newPlayerName.trim(),
      wins,
      losses,
      draws,
      hasByeHistory: false
    }
    
    setPlayers([...players, newPlayer])
    setNewPlayerName('')
    setNewPlayerScore('')
  }

  const removePlayer = (playerId: string) => {
    setPlayers(players.filter(player => player.id !== playerId))
    // Clear all pairings if a player is removed
    setAllPairings([])
    setCurrentRound(1)
  }

  // Swiss pairing algorithm - now uses the external function
  const generatePairings = () => {
    if (players.length < 2 || currentRound > maxRounds) return

    const updatePlayerBye = (playerId: string) => {
      const updatedPlayers = players.map(p => 
        p.id === playerId ? { ...p, hasByeHistory: true } : p
      )
      setPlayers(updatedPlayers)
    }

    const newPairings = generateSwissPairings(players, allPairings, currentRound, updatePlayerBye)
    setAllPairings([...allPairings, ...newPairings])
  }

  const nextRound = () => {
    if (currentRound < maxRounds) {
      setCurrentRound(currentRound + 1)
    }
  }

  const resetTournament = () => {
    setAllPairings([])
    setCurrentRound(1)
    localStorage.removeItem('mtg-swiss-manager-tournament')
  }

  const clearAllData = () => {
    setPlayers([])
    setAllPairings([])
    setCurrentRound(1)
    localStorage.removeItem('mtg-swiss-manager-tournament')
  }

  // Export tournament data as JSON file
  const handleExportData = () => {
    const tournamentData: TournamentData = {
      players,
      allPairings,
      currentRound,
      maxRounds
    }
    exportTournamentData(tournamentData)
  }

  // Import tournament data from JSON file
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const tournamentData = JSON.parse(e.target?.result as string)
        
        // Validate the data structure
        if (validateTournamentData(tournamentData)) {
          setPlayers(tournamentData.players)
          setAllPairings(tournamentData.allPairings)
          setCurrentRound(tournamentData.currentRound)
          setMaxRounds(tournamentData.maxRounds || 4) // Default to 4 for backwards compatibility
          alert('Tournament data imported successfully!')
        } else {
          alert('Invalid tournament data format!')
        }
      } catch {
        alert('Error reading file. Please ensure it\'s a valid tournament JSON file.')
      }
    }
    reader.readAsText(file)
    
    // Reset the input
    event.target.value = ''
  }

  // Report match result
  const reportMatchResult = (pairingId: string, player1Result: ResultType, player2Result: ResultType) => {
    const updatedPairings = allPairings.map(pairing => {
      if (pairing.id === pairingId) {
        return {
          ...pairing,
          result: {
            player1Result,
            player2Result,
            isReported: true
          }
        }
      }
      return pairing
    })
    
    setAllPairings(updatedPairings)
  }

  // Use useEffect to update player records when pairings change
  useEffect(() => {
    const updatedPlayers = calculatePlayerRecords(players, allPairings)
    if (JSON.stringify(updatedPlayers) !== JSON.stringify(players)) {
      setPlayers(updatedPlayers)
    }
  }, [allPairings, players])

  // Get pairings for current round
  const currentRoundPairings = allPairings.filter(pairing => pairing.round === currentRound)
  
  // Check if current round has pairings
  const hasCurrentRoundPairings = currentRoundPairings.length > 0

  return (
    <div className="app">
      <header>
        <h1>🃏 MTG Swiss Tournament Pairing</h1>
        <div className="tournament-status">
          <span className="round-indicator">Round {currentRound} of {maxRounds}</span>
          {currentRound > maxRounds && <span className="tournament-complete">Tournament Complete!</span>}
        </div>
      </header>

      <main>
        <section className="player-management">
          <h2>Player Management</h2>
          
          <div className="add-player">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Enter player name"
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            />
            <input
              type="text"
              value={newPlayerScore}
              onChange={(e) => setNewPlayerScore(e.target.value)}
              placeholder="Score (W-L-D, e.g., 2-1-0)"
              className="score-input"
            />
            <button onClick={addPlayer}>Add Player</button>
          </div>

          <PlayerList 
            players={players} 
            onRemovePlayer={removePlayer} 
          />

          <TournamentControls
            onResetTournament={resetTournament}
            onClearAllData={clearAllData}
            onExportData={handleExportData}
            onImportData={handleImportData}
          />
        </section>

        <section className="pairing-section">
          <div className="tournament-setup">
            <h2>Tournament Setup</h2>
            <div className="round-selector">
              <label htmlFor="maxRounds">Number of Rounds:</label>
              <select 
                id="maxRounds"
                value={maxRounds} 
                onChange={(e) => setMaxRounds(Number(e.target.value))}
                disabled={allPairings.length > 0} // Disable once tournament has started
              >
                {[3, 4, 5, 6, 7, 8].map(num => (
                  <option key={num} value={num}>{num} rounds</option>
                ))}
              </select>
              {allPairings.length > 0 && (
                <span className="setup-locked">
                  (Tournament in progress - settings locked)
                </span>
              )}
            </div>
          </div>

          <h2>Round {currentRound} of {maxRounds} Pairings</h2>
          
          <div className="pairing-controls">
            {!hasCurrentRoundPairings && currentRound <= maxRounds && (
              <button 
                onClick={generatePairings}
                disabled={players.length < 2}
                className="generate-btn"
              >
                Generate Round {currentRound} Pairings
              </button>
            )}
            
            {hasCurrentRoundPairings && currentRound < maxRounds && (
              <button 
                onClick={nextRound}
                className="next-round-btn"
                disabled={!areAllMatchesReported(allPairings, currentRound)}
              >
                {areAllMatchesReported(allPairings, currentRound)
                  ? `Advance to Round ${currentRound + 1}` 
                  : 'Report All Matches First'
                }
              </button>
            )}
          </div>

          <div className="pairings-list">
            {currentRoundPairings.length === 0 ? (
              <div>
                <p className="no-pairings">
                  {currentRound > maxRounds 
                    ? "Tournament is complete!" 
                    : "No pairings generated for this round yet"
                  }
                </p>
                {currentRound > maxRounds && (
                  <FinalStandings players={players} allPairings={allPairings} />
                )}
              </div>
            ) : (
              <div>
                <div className="round-status">
                  <h3>Round {currentRound} Matches</h3>
                  <span className="match-completion">
                    {currentRoundPairings.filter(p => p.player2 === null || p.result?.isReported).length} / {currentRoundPairings.length} matches complete
                  </span>
                </div>
                {currentRoundPairings.map((pairing, index) => (
                  <PairingItem
                    key={pairing.id}
                    pairing={pairing}
                    tableNumber={index + 1}
                    onReportResult={reportMatchResult}
                  />
                ))}
                
                {/* Show final standings when tournament is complete */}
                {currentRound === maxRounds && areAllMatchesReported(allPairings, currentRound) && (
                  <div className="tournament-complete-section">
                    <h2 className="tournament-complete-header">🎉 Tournament Complete! 🎉</h2>
                    <FinalStandings players={players} allPairings={allPairings} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Show all previous rounds */}
          {allPairings.length > currentRoundPairings.length && (
            <div className="previous-rounds">
              <h3>Previous Rounds</h3>
              {Array.from({length: currentRound - 1}, (_, i) => i + 1).map(roundNum => {
                const roundPairings = allPairings.filter(p => p.round === roundNum)
                return (
                  <div key={roundNum} className="previous-round">
                    <h4>Round {roundNum}</h4>
                    {roundPairings.map((pairing, index) => (
                      <PairingItem
                        key={pairing.id}
                        pairing={pairing}
                        tableNumber={index + 1}
                        onReportResult={reportMatchResult}
                        isPrevious={true}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
