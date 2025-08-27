import React from 'react'
import type { Player } from '../types'
import { getPlayerRecord, getPlayerPoints } from '../utils'

interface PlayerListProps {
  players: Player[]
  onRemovePlayer: (playerId: string) => void
}

export const PlayerList: React.FC<PlayerListProps> = ({ players, onRemovePlayer }) => {
  return (
    <div className="player-list">
      <h3>Players ({players.length})</h3>
      {players.length === 0 ? (
        <p className="no-players">No players added yet</p>
      ) : (
        <ul>
          {players.map(player => (
            <li key={player.id} className="player-item">
              <div className="player-info">
                <span className="player-name">{player.name}</span>
                <span className="player-record">
                  {getPlayerRecord(player)} ({getPlayerPoints(player)} pts)
                  {player.hasByeHistory && <span className="bye-indicator"> [Had BYE]</span>}
                </span>
              </div>
              <button 
                onClick={() => onRemovePlayer(player.id)}
                className="remove-btn"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
