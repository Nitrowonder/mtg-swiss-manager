import React from 'react'
import type { Pairing, ResultType } from '../types'

interface MatchResultProps {
  pairing: Pairing
  onReportResult: (pairingId: string, player1Result: ResultType, player2Result: ResultType) => void
}

export const MatchResult: React.FC<MatchResultProps> = ({ pairing, onReportResult }) => {
  if (!pairing.player2) {
    return null // BYE matches don't need result reporting
  }

  if (pairing.result?.isReported) {
    return (
      <div className="result-display">
        <span className="reported-result">
          Result: {pairing.player1.name} ({pairing.result.player1Result}) - 
          {pairing.player2.name} ({pairing.result.player2Result})
        </span>
      </div>
    )
  }

  return (
    <div className="result-buttons">
      <button 
        onClick={() => onReportResult(pairing.id, 'win', 'loss')}
        className="result-btn win-btn"
      >
        {pairing.player1.name} Wins
      </button>
      <button 
        onClick={() => onReportResult(pairing.id, 'draw', 'draw')}
        className="result-btn draw-btn"
      >
        Draw
      </button>
      <button 
        onClick={() => onReportResult(pairing.id, 'loss', 'win')}
        className="result-btn win-btn"
      >
        {pairing.player2.name} Wins
      </button>
    </div>
  )
}
