export interface Player {
  id: string
  name: string
  wins: number
  losses: number
  draws: number
  hasByeHistory: boolean
}

export interface MatchResult {
  player1Result: 'win' | 'loss' | 'draw' | null
  player2Result: 'win' | 'loss' | 'draw' | null
  isReported: boolean
}

export interface Pairing {
  id: string
  player1: Player
  player2: Player | null // null for BYE
  round: number
  result?: MatchResult
}

export interface TournamentData {
  players: Player[]
  allPairings: Pairing[]
  currentRound: number
  maxRounds: number
}

export type ResultType = 'win' | 'loss' | 'draw'
