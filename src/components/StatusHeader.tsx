import React from 'react';
import { useSwarmStore } from '../store/useSwarmStore';
import './StatusHeader.css';

interface StatusHeaderProps {
  onOpenSettings: () => void;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({ onOpenSettings }) => {
  const isRunning = useSwarmStore((state) => state.isRunning);
  const isPaused = useSwarmStore((state) => state.isPaused);
  const logs = useSwarmStore((state) => state.logs);
  const settings = useSwarmStore((state) => state.settings);
  const setSpeed = useSwarmStore((state) => state.setSpeed);
  
  // Calculate status
  let statusText = 'Bezczynny';
  let statusClass = 'idle';
  
  if (isRunning) {
    if (isPaused) {
      statusText = 'Wstrzymany';
      statusClass = 'paused';
    } else {
      statusText = 'Praca roju...';
      statusClass = 'running';
    }
  } else if (logs.length > 1) {
    const lastLog = logs[logs.length - 1];
    if (lastLog.type === 'success') {
      statusText = 'Gotowe';
      statusClass = 'success';
    } else if (lastLog.type === 'error') {
      statusText = 'Błąd';
      statusClass = 'error';
    }
  }

  const getProviderLabel = () => {
    switch (settings.preferProvider) {
      case 'gemini': return 'Google Gemini';
      case 'openai': return 'OpenAI GPT';
      case 'anthropic': return 'Anthropic Claude';
      case 'openrouter': return 'OpenRouter (Free)';
      default: return 'Brak';
    }
  };

  return (
    <header className="status-header">
      <div className="header-brand">
        <h1>SwarmMind</h1>
        <span className="divider">/</span>
        <p className="subtitle">Rój Agentów Refaktoryzujących</p>
      </div>

      <div className="header-controls">
        <div className="status-indicator-wrapper">
          <span className={`status-dot ${statusClass}`}></span>
          <span className="status-text">{statusText}</span>
        </div>

        <div className="header-kpi">
          <span className="kpi-label">Silnik AI:</span>
          <span className="kpi-value">{getProviderLabel()}</span>
        </div>

        <div className="header-kpi">
          <span className="kpi-label">Logi:</span>
          <span className="kpi-value">{logs.length}</span>
        </div>

        <div className="speed-control">
          <span className="kpi-label">Prędkość:</span>
          <div className="speed-buttons">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                className={`speed-btn ${settings.speed === s ? 'active' : ''}`}
                onClick={() => setSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <button className="settings-trigger" onClick={onOpenSettings} title="Ustawienia API">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Ustawienia
        </button>
      </div>
    </header>
  );
};
export default StatusHeader;
