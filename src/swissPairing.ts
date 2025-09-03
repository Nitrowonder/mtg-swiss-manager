import type { Player, Pairing } from './types'
import { getPlayerPoints, havePlayedBefore } from './utils'

// Helper function to assign BYE to a player
const assignBye = (
  player: Player, 
  pairings: Pairing[], 
  currentRound: number,
  updatePlayerBye: (playerId: string) => void
) => {
  updatePlayerBye(player.id)

  pairings.push({
    id: `${currentRound}-${Date.now()}-${pairings.length}`,
    player1: player,
    player2: null,
    round: currentRound
  })
}

// Helper function to create a pairing
const createPairing = (player1: Player, player2: Player, pairings: Pairing[], currentRound: number) => {
  pairings.push({
    id: `${currentRound}-${Date.now()}-${pairings.length}`,
    player1,
    player2,
    round: currentRound
  })
}

// Swiss pairing algorithm with score-based brackets and BYE history
export const generateSwissPairings = (
  players: Player[], 
  allPairings: Pairing[], 
  currentRound: number,
  updatePlayerBye: (playerId: string) => void
): Pairing[] => {
  if (players.length < 2) return []

  // Group players by their current points
  const playersByPoints = new Map<number, Player[]>()
  
  players.forEach(player => {
    const points = getPlayerPoints(player)
    if (!playersByPoints.has(points)) {
      playersByPoints.set(points, [])
    }
    playersByPoints.get(points)!.push(player)
  })

  // Sort point groups from highest to lowest
  const sortedPointGroups = Array.from(playersByPoints.entries())
    .sort(([a], [b]) => b - a)
    .map(([, players]) => players)

  const newPairings: Pairing[] = []
  let unpaired: Player[] = []

  // Pair within each point group with strict no-repeat policy
  for (const pointGroup of sortedPointGroups) {
    const availablePlayers = [...pointGroup, ...unpaired]
    unpaired = []

    // Shuffle for randomness within score bracket
    const shuffledPlayers = [...availablePlayers]
    shuffledPlayers.sort(() => Math.random() - 0.5)

    // Pair players avoiding previous opponents
    while (shuffledPlayers.length > 1) {
      const player1 = shuffledPlayers.shift()!
      let paired = false

      for (let i = 0; i < shuffledPlayers.length; i++) {
        const player2 = shuffledPlayers[i]
        
        if (!havePlayedBefore(player1.id, player2.id, allPairings)) {
          shuffledPlayers.splice(i, 1)
          createPairing(player1, player2, newPairings, currentRound)
          paired = true
          break
        }
      }

      // If no valid pairing found, add to unpaired for next round or cross-bracket pairing
      if (!paired) {
        unpaired.push(player1)
      }
    }

    if (shuffledPlayers.length === 1) {
      unpaired.push(shuffledPlayers[0])
    }
  }

  // Handle unpaired players - try cross-bracket pairing first
  if (unpaired.length >= 2) {
    // Attempt to pair unpaired players from different point groups
    const tempUnpaired = [...unpaired]
    unpaired = []

    while (tempUnpaired.length > 1) {
      const player1 = tempUnpaired.shift()!
      let paired = false

      for (let i = 0; i < tempUnpaired.length; i++) {
        const player2 = tempUnpaired[i]
        
        if (!havePlayedBefore(player1.id, player2.id, allPairings)) {
          tempUnpaired.splice(i, 1)
          createPairing(player1, player2, newPairings, currentRound)
          paired = true
          break
        }
      }

      if (!paired) {
        unpaired.push(player1)
      }
    }

    if (tempUnpaired.length === 1) {
      unpaired.push(tempUnpaired[0])
    }
  }

  // Handle remaining unpaired players (BYE assignment or forced pairing)
  if (unpaired.length === 1) {
    assignBye(unpaired[0], newPairings, currentRound, updatePlayerBye)
  } else if (unpaired.length >= 2) {
    // Last resort: if we still have unpaired players, we may need to allow repeat pairings
    // But first, try to minimize this by giving someone a BYE if odd number
    if (unpaired.length % 2 === 1) {
      // For round 1: random BYE assignment
      if (currentRound === 1) {
        const randomIndex = Math.floor(Math.random() * unpaired.length)
        const byePlayer = unpaired.splice(randomIndex, 1)[0]
        assignBye(byePlayer, newPairings, currentRound, updatePlayerBye)
      } else {
        // For subsequent rounds: player with fewest points and no BYE history gets BYE
        unpaired.sort((a, b) => {
          const pointsA = getPlayerPoints(a)
          const pointsB = getPlayerPoints(b)
          
          if (pointsA !== pointsB) {
            return pointsA - pointsB // Lowest points first
          }
          
          // If tied on points, prioritize those without BYE history
          if (a.hasByeHistory !== b.hasByeHistory) {
            return (a.hasByeHistory ? 1 : 0) - (b.hasByeHistory ? 1 : 0)
          }
          
          return Math.random() - 0.5
        })
        
        const byePlayer = unpaired.shift()!
        assignBye(byePlayer, newPairings, currentRound, updatePlayerBye)
      }
    }
    
    // Pair remaining players (this should now be even number)
    while (unpaired.length >= 2) {
      const player1 = unpaired.shift()!
      // Try to find the best available opponent (avoiding repeats if possible)
      let bestOpponentIndex = 0
      
      for (let i = 1; i < unpaired.length; i++) {
        if (!havePlayedBefore(player1.id, unpaired[i].id, allPairings)) {
          bestOpponentIndex = i
          break
        }
      }
      
      const player2 = unpaired.splice(bestOpponentIndex, 1)[0]
      createPairing(player1, player2, newPairings, currentRound)
    }
  }

  return newPairings
}
