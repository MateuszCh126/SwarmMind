import React, { useState } from 'react';
import { useSwarmStore } from '../store/useSwarmStore';
import { runSwarmOrchestration } from '../utils/scenarioRunner';
import { exportSwarmResult } from '../utils/exportResult';
import './Sidebar.css';

const defaultCode = `// Ta funkcja liczy liczby fibonacziego ale jest bardzo wolna i nieoptymalna
function oblicz_liczbe_fibonacciego(n) {
  console.log("Liczenie dla: " + n);
  if (n == 0) {
    return 0;
  }
  if (n == 1) {
    return 1;
  }
  // Rekurencja bez spamiętywania
  var wynik = oblicz_liczbe_fibonacciego(n - 1) + oblicz_liczbe_fibonacciego(n - 2);
  return wynik;
}`;

export const Sidebar: React.FC = () => {
  const store = useSwarmStore();
  
  const [goal, setGoal] = useState('Zoptymalizuj funkcję, zlikwiduj powolną rekurencję (zastosuj spamiętywanie lub iterację) i dodaj typowanie JSDoc.');
  const [code, setCode] = useState(defaultCode);
  const [errorMsg, setErrorMsg] = useState('');

  const handleStart = async () => {
    // Check if API key is entered for the chosen provider
    const settings = store.settings;
    const provider = settings.preferProvider;
    const key = provider === 'gemini' ? settings.geminiKey :
                provider === 'openai' ? settings.openaiKey :
                provider === 'openrouter' ? settings.openrouterKey :
                settings.anthropicKey;

    if (!key) {
      const providerName = provider === 'gemini' ? 'Google Gemini'
        : provider === 'openai' ? 'OpenAI'
        : provider === 'openrouter' ? 'OpenRouter'
        : 'Anthropic';
      setErrorMsg(`Błąd: Brak klucza API dla ${providerName}. Skonfiguruj go w Ustawieniach w prawym górnym rogu.`);
      return;
    }

    setErrorMsg('');
    store.startSwarm(goal, code);
    
    // Run async loop
    await runSwarmOrchestration();
  };

  const handleStop = () => {
    store.stopSwarm();
  };

  const handleReset = () => {
    store.resetSwarm();
    setCode(defaultCode);
    setGoal('Zoptymalizuj funkcję, zlikwiduj powolną rekurencję (zastosuj spamiętywanie lub iterację) i dodaj typowanie JSDoc.');
    setErrorMsg('');
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="task-icon success" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        );
      case 'failed':
        return (
          <svg className="task-icon error" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        );
      case 'running':
        return <span className="task-spinner"></span>;
      default:
        return <span className="task-dot-pending"></span>;
    }
  };

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-section">
        <h3>1. Cel Refaktoryzacji</h3>
        <textarea
          className="sidebar-textarea goal-input"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={store.isRunning}
          placeholder="Wpisz cel refaktoryzacji..."
        />
      </div>

      <div className="sidebar-section code-section">
        <h3>2. Kod do poprawy</h3>
        <textarea
          className="sidebar-textarea code-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={store.isRunning}
          placeholder="Wklej tutaj kod źródłowy..."
        />
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="control-panel">
        {!store.isRunning ? (
          <button 
            type="button" 
            className="btn-action start-btn" 
            onClick={handleStart}
            disabled={!goal.trim() || !code.trim()}
          >
            Uruchom Swarm
          </button>
        ) : (
          <div className="running-controls">
            <button 
              type="button" 
              className={`btn-action pause-btn ${store.isPaused ? 'paused' : ''}`} 
              onClick={store.togglePause}
            >
              {store.isPaused ? 'Wznów' : 'Wstrzymaj'}
            </button>
            <button 
              type="button" 
              className="btn-action stop-btn" 
              onClick={handleStop}
            >
              Zatrzymaj
            </button>
          </div>
        )}
        <button 
          type="button" 
          className="btn-action reset-btn" 
          onClick={handleReset}
          disabled={store.isRunning}
        >
          Resetuj
        </button>
      </div>

      {store.agents.coder.codeContent && (
        <button
          type="button"
          className="btn-action export-btn"
          onClick={() => exportSwarmResult({
            goal: store.goal,
            inputCode: store.inputCode,
            blueprint: store.agents.architect.codeContent || '',
            code: store.agents.coder.codeContent || '',
            tests: store.agents.tester.codeContent || '',
            testResults: store.agents.tester.testContent || '',
            reviewerFeedback: store.agents.reviewer.feedback || ''
          })}
        >
          Pobierz wynik (.md)
        </button>
      )}

      <div className="sidebar-section tasks-section">
        <h3>3. Postęp Zadań</h3>
        <div className="task-list">
          {store.tasks.map((task, idx) => {
            const isActive = store.isRunning && store.activeTaskIndex === idx;
            return (
              <div key={task.id} className={`task-item ${isActive ? 'active' : ''} ${task.status}`}>
                {getTaskStatusIcon(task.status)}
                <span className="task-name">{task.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
