import React from 'react'
import type { Player, Pairing } from '../types'
import { getPlayerStanding, calculateStrengthOfSchedule, getHeadToHeadResult } from '../utils'

interface FinalStandingsProps {
  players: Player[]
  allPairings: Pairing[]
}

export const FinalStandings: React.FC<FinalStandingsProps> = ({ players, allPairings }) => {
  // Sort players by tournament standing with comprehensive tiebreakers
  const sortedPlayers = [...players].sort((a, b) => {
    const recordA = getPlayerStanding(a, allPairings)
    const recordB = getPlayerStanding(b, allPairings)
    
    // 1. Total points (primary - most important)
    if (recordA.points !== recordB.points) {
      return recordB.points - recordA.points
    }
    
    // 2. Win percentage (games won/total games) - rewards efficiency
    if (recordA.winPercentage !== recordB.winPercentage) {
      return recordB.winPercentage - recordA.winPercentage
    }
    
    // 3. Strength of Schedule (average opponent points) - quality of opponents
    const sosA = calculateStrengthOfSchedule(a, allPairings)
    const sosB = calculateStrengthOfSchedule(b, allPairings)
    if (Math.abs(sosA - sosB) > 0.01) { // Use small epsilon for floating point comparison
      return sosB - sosA // Higher SoS ranks higher
    }
    
    // 4. Head-to-head record (if they played each other)
    const h2h = getHeadToHeadResult(a, b, allPairings)
    if (h2h !== 'tie') {
      return h2h === 'a' ? -1 : 1
    }
    
    // 5. Total games played (fewer is better if same win percentage)
    if (recordA.totalGames !== recordB.totalGames) {
      return recordA.totalGames - recordB.totalGames
    }
    
    // 6. Alphabetical by name (final tiebreaker for consistency)
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="final-standings">
      <h2>🏆 Final Tournament Standings</h2>
      <div className="standings-list">
        {sortedPlayers.map((player, index) => {
          const record = getPlayerStanding(player, allPairings)
          const sos = calculateStrengthOfSchedule(player, allPairings)
          const placement = index + 1
          
          return (
            <div key={player.id} className={`standing-item ${placement <= 3 ? 'podium' : ''}`}>
              <div className="placement">
                <span className="rank">#{placement}</span>
                {placement === 1 && <span className="trophy">🥇</span>}
                {placement === 2 && <span className="trophy">🥈</span>}
                {placement === 3 && <span className="trophy">🥉</span>}
              </div>
              
              <div className="standings-player-info">
                <h3 className="standings-player-name">{player.name}</h3>
                <div className="player-stats">
                  <span className="points">{record.points} pts</span>
                  <span className="record">
                    {record.wins}-{record.losses}
                    {record.byes > 0 && `-${record.byes} bye${record.byes > 1 ? 's' : ''}`}
                  </span>
                  <span className="win-percentage">
                    {(record.winPercentage * 100).toFixed(1)}%
                  </span>
                  <span className="strength-of-schedule" title="Strength of Schedule - Average opponent points">
                    SoS: {sos.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
