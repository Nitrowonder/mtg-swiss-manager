import type { Player, Pairing, TournamentData } from './types'

// Function to get a player's current record
export const getPlayerRecord = (player: Player): string => {
  return `${player.wins}-${player.losses}-${player.draws}`
}

// Function to get a player's match points (3 for win, 1 for draw, 0 for loss)
export const getPlayerPoints = (player: Player): number => {
  return player.wins * 3 + player.draws * 1
}

// Function to check if two players have played against each other
export const havePlayedBefore = (player1Id: string, player2Id: string, allPairings: Pairing[]): boolean => {
  return allPairings.some(pairing => 
    (pairing.player1.id === player1Id && pairing.player2?.id === player2Id) ||
    (pairing.player1.id === player2Id && pairing.player2?.id === player1Id)
  )
}

// Parse score string (format: "2-1-0" or "2-1" for W-L-D or W-L)
export const parsePlayerScore = (scoreString: string): { wins: number; losses: number; draws: number } => {
  if (!scoreString.trim()) {
    return { wins: 0, losses: 0, draws: 0 }
  }
  
  const scoreParts = scoreString.trim().split('-').map(s => parseInt(s) || 0)
  return {
    wins: scoreParts[0] || 0,
    losses: scoreParts[1] || 0,
    draws: scoreParts[2] || 0
  }
}

// Export tournament data as JSON file
export const exportTournamentData = (data: TournamentData): void => {
  const dataStr = JSON.stringify(data, null, 2)
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
  
  const exportFileDefaultName = `mtg-swiss-manager-${new Date().toISOString().split('T')[0]}.json`
  
  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', exportFileDefaultName)
  linkElement.click()
}

// Validate tournament data structure
export const validateTournamentData = (data: unknown): data is TournamentData => {
  if (!data || typeof data !== 'object') return false
  
  const obj = data as Record<string, unknown>
  
  return (
    Array.isArray(obj.players) &&
    Array.isArray(obj.allPairings) &&
    typeof obj.currentRound === 'number' &&
    (typeof obj.maxRounds === 'number' || obj.maxRounds === undefined) && // Optional for backwards compatibility
    obj.players.every((player: unknown) => {
      if (!player || typeof player !== 'object') return false
      const p = player as Record<string, unknown>
      return (
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.wins === 'number' &&
        typeof p.losses === 'number' &&
        typeof p.draws === 'number' &&
        typeof p.hasByeHistory === 'boolean'
      )
    })
  )
}

// Check if all matches in a round are reported
export const areAllMatchesReported = (allPairings: Pairing[], currentRound: number): boolean => {
  const currentRoundPairings = allPairings.filter(p => p.round === currentRound)
  return currentRoundPairings.every(pairing => 
    pairing.player2 === null || pairing.result?.isReported
  )
}

// Calculate updated player records based on match results
export const getPlayerStanding = (player: Player, allPairings: Pairing[]) => {
  let wins = 0
  let losses = 0
  let draws = 0
  let byes = 0
  
  // Count results from all matches involving this player
  allPairings.forEach(pairing => {
    // Handle BYE
    if ((pairing.player1.id === player.id && !pairing.player2) || 
        (pairing.player2?.id === player.id && !pairing.player1)) {
      byes++
      return
    }
    
    // Handle reported matches
    if (pairing.result?.isReported) {
      if (pairing.player1.id === player.id) {
        switch (pairing.result.player1Result) {
          case 'win': wins++; break
          case 'loss': losses++; break
          case 'draw': draws++; break
        }
      } else if (pairing.player2?.id === player.id) {
        switch (pairing.result.player2Result) {
          case 'win': wins++; break
          case 'loss': losses++; break
          case 'draw': draws++; break
        }
      }
    }
  })
  
  const points = (wins * 3) + (draws * 1) + (byes * 3) // BYE counts as a win
  const totalGames = wins + losses + draws
  const winPercentage = totalGames > 0 ? wins / totalGames : 0
  
  return {
    wins,
    losses,
    draws,
    byes,
    points,
    winPercentage,
    totalGames
  }
}

// Get all opponents a player faced during the tournament
export const getOpponents = (playerId: string, allPairings: Pairing[]): Player[] => {
  return allPairings
    .filter(pairing => 
      pairing.player1.id === playerId || pairing.player2?.id === playerId
    )
    .map(pairing => 
      pairing.player1.id === playerId ? pairing.player2 : pairing.player1
    )
    .filter((opponent): opponent is Player => opponent !== null)
}

// Calculate Strength of Schedule - average points of all opponents faced
export const calculateStrengthOfSchedule = (player: Player, allPairings: Pairing[]): number => {
  const opponents = getOpponents(player.id, allPairings)
  
  if (opponents.length === 0) return 0
  
  const opponentPoints = opponents.map(opponent => 
    getPlayerStanding(opponent, allPairings).points
  )
  
  return opponentPoints.reduce((sum, pts) => sum + pts, 0) / opponents.length
}

// Check head-to-head result between two players
export const getHeadToHeadResult = (playerA: Player, playerB: Player, allPairings: Pairing[]): 'a' | 'b' | 'tie' => {
  const h2hPairing = allPairings.find(pairing => 
    (pairing.player1.id === playerA.id && pairing.player2?.id === playerB.id) ||
    (pairing.player1.id === playerB.id && pairing.player2?.id === playerA.id)
  )
  
  if (!h2hPairing?.result?.isReported) return 'tie'
  
  // Determine who won
  if (h2hPairing.player1.id === playerA.id) {
    if (h2hPairing.result.player1Result === 'win') return 'a'
    if (h2hPairing.result.player1Result === 'loss') return 'b'
    return 'tie'
  } else {
    if (h2hPairing.result.player2Result === 'win') return 'b'
    if (h2hPairing.result.player2Result === 'loss') return 'a'
    return 'tie'
  }
}

export const calculatePlayerRecords = (players: Player[], allPairings: Pairing[]): Player[] => {
  return players.map(player => {
    let wins = 0
    let losses = 0
    let draws = 0
    
    // Count results from all reported matches
    allPairings.forEach(pairing => {
      if (pairing.result?.isReported) {
        if (pairing.player1.id === player.id) {
          switch (pairing.result.player1Result) {
            case 'win': wins++; break
            case 'loss': losses++; break
            case 'draw': draws++; break
          }
        } else if (pairing.player2?.id === player.id) {
          switch (pairing.result.player2Result) {
            case 'win': wins++; break
            case 'loss': losses++; break
            case 'draw': draws++; break
          }
        }
      }
      
      // Handle BYE (automatic win)
      if (pairing.player2 === null && pairing.player1.id === player.id) {
        wins++
      }
    })
    
    return {
      ...player,
      wins,
      losses,
      draws
    }
  })
}
