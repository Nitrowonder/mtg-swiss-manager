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

  // Pair within each point group
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

      if (!paired && shuffledPlayers.length > 0) {
        const player2 = shuffledPlayers.shift()!
        createPairing(player1, player2, newPairings, currentRound)
      } else if (!paired) {
        unpaired.push(player1)
      }
    }

    if (shuffledPlayers.length === 1) {
      unpaired.push(shuffledPlayers[0])
    }
  }

  // Handle unpaired players (BYE assignment)
  if (unpaired.length === 1) {
    assignBye(unpaired[0], newPairings, currentRound, updatePlayerBye)
  } else if (unpaired.length > 1) {
    // For round 1: random BYE assignment
    if (currentRound === 1) {
      // Randomly select one player for BYE
      const randomIndex = Math.floor(Math.random() * unpaired.length)
      const byePlayer = unpaired.splice(randomIndex, 1)[0]
      assignBye(byePlayer, newPairings, currentRound, updatePlayerBye)
    } else {
      // For subsequent rounds: lowest ranking gets BYE
      // Sort by points (ascending) and then by BYE history (those without BYE first)
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
        
        // If still tied, random
        return Math.random() - 0.5
      })
      
      // Give BYE to the lowest ranked player
      const byePlayer = unpaired.shift()!
      assignBye(byePlayer, newPairings, currentRound, updatePlayerBye)
    }
    
    // Pair remaining players randomly
    while (unpaired.length > 1) {
      const player1 = unpaired.shift()!
      const player2 = unpaired.shift()!
      createPairing(player1, player2, newPairings, currentRound)
    }
    
    // If there's still one unpaired (shouldn't happen with proper logic)
    if (unpaired.length === 1) {
      assignBye(unpaired[0], newPairings, currentRound, updatePlayerBye)
    }
  }

  return newPairings
}
