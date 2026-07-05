import React, { useState, useEffect } from 'react';
import { useSwarmStore } from '../store/useSwarmStore';
import { PROVIDER_LABELS } from '../services/llmService';
import DiffView from './DiffView';
import './AgentInspector.css';

export const AgentInspector: React.FC = () => {
  const activeAgentId = useSwarmStore((state) => state.activeAgentId);
  const selectAgent = useSwarmStore((state) => state.selectAgent);
  const agent = useSwarmStore((state) => (activeAgentId ? state.agents[activeAgentId] : null));
  const preferProvider = useSwarmStore((state) => state.settings.preferProvider);
  const inputCode = useSwarmStore((state) => state.inputCode);

  const setAgentPrompt = useSwarmStore((state) => state.setAgentPrompt);
  const resetAgentPrompt = useSwarmStore((state) => state.resetAgentPrompt);
  const isRunning = useSwarmStore((state) => state.isRunning);

  const [activeTab, setActiveTab] = useState<'content' | 'config' | 'prompt' | 'diff'>('content');
  const [copied, setCopied] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');

  // Po przełączeniu agenta wróć do głównej zakładki (unika pustej zakładki Diff
  // przy agentach innych niż Coder).
  useEffect(() => {
    setActiveTab('content');
    setCopied(false);
  }, [activeAgentId]);

  // Synchronizuj szkic promptu z aktualnym promptem agenta (także po zapisie/przywróceniu).
  useEffect(() => {
    setPromptDraft(agent?.systemPrompt ?? '');
  }, [activeAgentId, agent?.systemPrompt]);

  const showDiff = agent?.id === 'coder' && !!inputCode && !!agent?.codeContent;

  if (!agent) {
    return (
      <aside className="inspector empty glass-panel">
        <div className="empty-state">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <p>Kliknij dowolnego agenta na grafie, aby zobaczyć szczegóły jego pracy, wygenerowany kod lub konfigurację systemową.</p>
        </div>
      </aside>
    );
  }

  const handleCopy = () => {
    const textToCopy = agent.codeContent || '';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 200);
  };

  const getAgentTypeLabel = () => {
    switch (agent.id) {
      case 'architect': return 'Architect';
      case 'coder': return 'Coder';
      case 'tester': return 'Tester';
      case 'reviewer': return 'Reviewer';
      default: return 'Agent';
    }
  };

  return (
    <aside className="inspector glass-panel animated-fade-in">
      <div className="inspector-header">
        <div className="inspector-title">
          <span className={`inspector-tag ${agent.id}`}>{getAgentTypeLabel()}</span>
          <h2>{agent.name}</h2>
        </div>
        <button className="close-btn" onClick={() => selectAgent(null)}>&times;</button>
      </div>

      <div className="inspector-tabs">
        <button 
          className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          Kod / Dane
        </button>
        <button 
          className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Konfiguracja
        </button>
        <button
          className={`tab-btn ${activeTab === 'prompt' ? 'active' : ''}`}
          onClick={() => setActiveTab('prompt')}
        >
          System Prompt
        </button>
        {showDiff && (
          <button
            className={`tab-btn ${activeTab === 'diff' ? 'active' : ''}`}
            onClick={() => setActiveTab('diff')}
          >
            Diff
          </button>
        )}
      </div>

      <div className="inspector-body">
        {activeTab === 'content' && (
          <div className="tab-content content-view">
            {agent.codeContent ? (
              <div className="code-container">
                <div className="code-header">
                  <span>{agent.id === 'architect' ? 'PLAN ARCHITEKTONICZNY' : agent.id === 'tester' ? 'KOD TESTÓW' : 'ZREFAKTORYZOWANY KOD'}</span>
                  <button className="copy-btn" onClick={handleCopy}>
                    {copied ? 'Skopiowano!' : 'Kopiuj'}
                  </button>
                </div>
                <pre className="code-display">
                  <code>{agent.codeContent}</code>
                </pre>

                {agent.id === 'tester' && agent.testContent && (
                  <div className="tester-console-output">
                    <div className="console-header">KONSOLA TESTOWA</div>
                    <pre className="console-display">
                      <code>{agent.testContent}</code>
                    </pre>
                  </div>
                )}

                {agent.id === 'reviewer' && agent.feedback && (
                  <div className={`reviewer-feedback-box ${agent.status}`}>
                    <div className="feedback-header">RAPORT OPINII REVIEWERA</div>
                    <p className="feedback-text">{agent.feedback}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-content-state">
                <p>Agent nie wypracował jeszcze żadnych danych dla tej sesji.</p>
                {agent.status === 'idle' ? (
                  <span>Oczekiwanie na uruchomienie procesu.</span>
                ) : (
                  <span className="pulsing-text">Trwa generowanie danych...</span>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'diff' && showDiff && (
          <div className="tab-content">
            <DiffView original={inputCode} modified={agent.codeContent || ''} />
          </div>
        )}

        {activeTab === 'config' && (
          <div className="tab-content config-view">
            <div className="info-group">
              <span className="info-label">Nazwa Agenta</span>
              <span className="info-value">{agent.name}</span>
            </div>
            <div className="info-group">
              <span className="info-label">Rola Systemowa</span>
              <span className="info-value">{agent.role}</span>
            </div>
            <div className="info-group">
              <span className="info-label">Model Fundacyjny</span>
              <span className="info-value">{PROVIDER_LABELS[preferProvider]}</span>
            </div>
            <div className="info-group">
              <span className="info-label">Aktualny Status</span>
              <span className="info-value capitalize">{agent.status}</span>
            </div>
            {typeof agent.durationMs === 'number' && (
              <div className="info-group">
                <span className="info-label">Czas pracy</span>
                <span className="info-value">{(agent.durationMs / 1000).toFixed(1)} s</span>
              </div>
            )}
            {typeof agent.tokens === 'number' && agent.tokens > 0 && (
              <div className="info-group">
                <span className="info-label">Zużyte tokeny</span>
                <span className="info-value">{agent.tokens.toLocaleString('pl-PL')}</span>
              </div>
            )}
            {agent.status !== 'idle' && (
              <div className="info-group">
                <span className="info-label">Bieżące Zadanie</span>
                <span className="info-value highlight">{agent.currentTask}</span>
              </div>
            )}
            <div className="info-group">
              <span className="info-label">Koordynaty Węzła</span>
              <span className="info-value">X: {agent.x}px, Y: {agent.y}px</span>
            </div>
          </div>
        )}

        {activeTab === 'prompt' && (
          <div className="tab-content prompt-view">
            <label className="prompt-label">SYSTEM INSTRUCTIONS (edytowalne)</label>
            <textarea
              className="prompt-editor"
              value={promptDraft}
              onChange={(e) => setPromptDraft(e.target.value)}
              disabled={isRunning}
              spellCheck={false}
            />
            <div className="prompt-actions">
              <button
                type="button"
                className="prompt-save"
                disabled={isRunning || promptDraft.trim() === '' || promptDraft === agent.systemPrompt}
                onClick={() => setAgentPrompt(agent.id, promptDraft)}
              >
                Zapisz prompt
              </button>
              <button
                type="button"
                className="prompt-reset"
                disabled={isRunning}
                onClick={() => resetAgentPrompt(agent.id)}
              >
                Przywróć domyślny
              </button>
            </div>
            <span className="prompt-hint">
              {isRunning ? 'Zatrzymaj rój, aby edytować prompt.' : 'Zmiany są trwałe (localStorage) i wpływają na kolejny przebieg.'}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
export default AgentInspector;
