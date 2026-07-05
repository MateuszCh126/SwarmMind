import React, { useEffect, useRef, useState } from 'react';
import { useSwarmStore } from '../store/useSwarmStore';
import type { LogEntry } from '../types';
import './TerminalFeed.css';

export const TerminalFeed: React.FC = () => {
  const logs = useSwarmStore((state) => state.logs);
  const selectAgent = useSwarmStore((state) => state.selectAgent);
  
  const [filter, setFilter] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalBodyRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll on new logs
  useEffect(() => {
    if (terminalEndRef.current && terminalBodyRef.current) {
      const body = terminalBodyRef.current;
      const isScrolledToBottom = body.scrollHeight - body.clientHeight - body.scrollTop < 100;
      
      if (isScrolledToBottom || logs.length === 1) {
        terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [logs.length]);

  const toggleExpandLog = (id: string, agentId?: string) => {
    setExpandedLogs((prev) => ({ ...prev, [id]: !prev[id] }));
    if (agentId && agentId !== 'system' && (agentId === 'architect' || agentId === 'coder' || agentId === 'tester' || agentId === 'reviewer')) {
      selectAgent(agentId);
    }
  };

  const getLogTypeLabel = (entry: LogEntry) => {
    if (entry.agentId === 'system') return 'system';
    return entry.agentName;
  };

  const getFilteredLogs = () => {
    if (filter === 'all') return logs;
    if (filter === 'system') return logs.filter(l => l.agentName.toLowerCase() === 'system' || !l.agentId);
    return logs.filter(l => l.agentId === filter);
  };

  const filteredLogs = getFilteredLogs();

  return (
    <div className="terminal-container glass-panel">
      <div className="terminal-header">
        <div className="terminal-title-bar">
          <div className="terminal-dots">
            <span className="dot red"></span>
            <span className="dot yellow"></span>
            <span className="dot green"></span>
          </div>
          <span className="terminal-title">terminal.log</span>
        </div>
        
        <div className="terminal-filters">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Wszystkie</button>
          <button className={`filter-btn ${filter === 'system' ? 'active' : ''}`} onClick={() => setFilter('system')}>System</button>
          <button className={`filter-btn ${filter === 'architect' ? 'active' : ''}`} onClick={() => setFilter('architect')}>Architect</button>
          <button className={`filter-btn ${filter === 'coder' ? 'active' : ''}`} onClick={() => setFilter('coder')}>Coder</button>
          <button className={`filter-btn ${filter === 'tester' ? 'active' : ''}`} onClick={() => setFilter('tester')}>Tester</button>
          <button className={`filter-btn ${filter === 'reviewer' ? 'active' : ''}`} onClick={() => setFilter('reviewer')}>Reviewer</button>
        </div>
      </div>

      <div className="terminal-body" ref={terminalBodyRef}>
        {filteredLogs.length === 0 ? (
          <div className="terminal-empty">Brak logów w wybranej kategorii. Uruchom Swarm, aby rozpocząć proces.</div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = !!expandedLogs[log.id];
            const hasDetails = !!log.details;
            
            return (
              <div key={log.id} className={`log-row ${log.type}`}>
                <span className="log-time">[{log.timestamp}]</span>
                <span className={`log-badge ${log.agentId || 'system'}`}>
                  {getLogTypeLabel(log)}
                </span>
                <span className="log-message">{log.message}</span>
                
                {hasDetails && (
                  <button 
                    className="log-detail-btn"
                    onClick={() => toggleExpandLog(log.id, log.agentId as string)}
                  >
                    {isExpanded ? 'Ukryj kod [-]' : 'Pokaż kod [+]'}
                  </button>
                )}

                {hasDetails && isExpanded && (
                  <pre className="log-code-block">
                    <code>{log.details}</code>
                  </pre>
                )}
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
export default TerminalFeed;
