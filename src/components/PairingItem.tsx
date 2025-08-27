import React from 'react'
import type { Pairing, ResultType } from '../types'
import { MatchResult } from './MatchResult'

interface PairingItemProps {
  pairing: Pairing
  tableNumber: number
  onReportResult: (pairingId: string, player1Result: ResultType, player2Result: ResultType) => void
  isPrevious?: boolean
}

export const PairingItem: React.FC<PairingItemProps> = ({ 
  pairing, 
  tableNumber, 
  onReportResult, 
  isPrevious = false 
}) => {
  return (
    <div className={`pairing-item ${isPrevious ? 'previous' : ''}`}>
      <div className="match-info">
        <strong>Table {tableNumber}:</strong>
        <span className="pairing-players">
          {pairing.player1.name} 
          {pairing.player2 ? (
            <> vs {pairing.player2.name}</>
          ) : (
            <span className="bye"> (BYE - Auto Win)</span>
          )}
        </span>
      </div>
      
      {!isPrevious && (
        <div className="result-reporting">
          <MatchResult pairing={pairing} onReportResult={onReportResult} />
        </div>
      )}
    </div>
  )
}
