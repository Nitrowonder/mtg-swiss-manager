import React from 'react'

interface TournamentControlsProps {
  onResetTournament: () => void
  onClearAllData: () => void
  onExportData: () => void
  onImportData: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export const TournamentControls: React.FC<TournamentControlsProps> = ({
  onResetTournament,
  onClearAllData,
  onExportData,
  onImportData
}) => {
  return (
    <div className="tournament-controls">
      <button 
        onClick={onResetTournament}
        className="reset-btn"
      >
        Reset Tournament
      </button>
      <button 
        onClick={onClearAllData}
        className="clear-all-btn"
      >
        Clear All Data
      </button>
      <button 
        onClick={onExportData}
        className="export-btn"
      >
        Export Data
      </button>
      <label className="import-btn">
        Import Data
        <input
          type="file"
          accept=".json"
          onChange={onImportData}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  )
}
