import React from 'react';
import { useSwarmStore } from '../store/useSwarmStore';
import type { AgentId } from '../types';
import './AgentGraph.css';

export const AgentGraph: React.FC = () => {
  const agents = useSwarmStore((state) => state.agents);
  const connections = useSwarmStore((state) => state.connections);
  const activeAgentId = useSwarmStore((state) => state.activeAgentId);
  const selectAgent = useSwarmStore((state) => state.selectAgent);
  const currentStep = useSwarmStore((state) => state.currentStepDescription);
  const logs = useSwarmStore((state) => state.logs);
  const isRunning = useSwarmStore((state) => state.isRunning);
  const isError = !isRunning && logs.length > 0 && logs[logs.length - 1].type === 'error';

  const handleNodeClick = (id: AgentId) => {
    selectAgent(activeAgentId === id ? null : id);
  };

  // Helper to generate SVG path between agent coordinates
  const getPathData = (fromId: AgentId, toId: AgentId) => {
    const from = agents[fromId];
    const to = agents[toId];
    if (!from || !to) return '';
    
    // Draw arcs/curves instead of straight lines
    if (fromId === 'architect' && toId === 'coder') {
      // Curve curving left
      return `M ${from.x} ${from.y} C ${from.x - 50} ${from.y + 80}, ${to.x} ${to.y - 80}, ${to.x} ${to.y}`;
    }
    if (fromId === 'coder' && toId === 'tester') {
      // Loop under or straight line with slight curve
      return `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${from.y + 40}, ${to.x} ${to.y}`;
    }
    if (fromId === 'tester' && toId === 'reviewer') {
      // Curve curving left
      return `M ${from.x} ${from.y} C ${from.x} ${from.y + 80}, ${to.x + 50} ${to.y - 80}, ${to.x} ${to.y}`;
    }
    if (fromId === 'reviewer' && toId === 'coder') {
      // Curve looping back up
      return `M ${from.x} ${from.y} C ${from.x - 80} ${from.y - 40}, ${to.x} ${to.y + 80}, ${to.x} ${to.y}`;
    }

    // Fallback straight line
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  };

  const getAgentStatusText = (status: string) => {
    switch (status) {
      case 'thinking': return 'Myśli...';
      case 'working': return 'Pracuje...';
      case 'success': return 'Zakończono';
      case 'error': return 'Błąd';
      default: return 'Oczekiwanie';
    }
  };

  return (
    <div className="graph-container">
      <div className={`graph-step-overlay ${isError ? 'error' : ''}`}>
        <span className="step-title">{isError ? 'Błąd:' : 'Orkiestrator Swarmu:'}</span>
        <span className="step-desc">{currentStep}</span>
      </div>

      <div className="canvas-wrapper">
        {/* SVG Connections Layer */}
        <svg className="connections-svg" width="800" height="560" viewBox="0 0 800 560">
          <defs>
            <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2f80ed" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#30d158" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {connections.map((conn, idx) => {
            const pathData = getPathData(conn.from, conn.to);
            return (
              <g key={`${conn.from}-${conn.to}-${idx}`}>
                {/* Background static path */}
                <path
                  d={pathData}
                  className="connection-back"
                  fill="none"
                />
                {/* Active animated path */}
                {conn.isActive && (
                  <path
                    d={pathData}
                    className={`connection-front ${conn.status}`}
                    fill="none"
                    filter="url(#glow)"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* HTML Agent Nodes Layer */}
        {Object.values(agents).map((agent) => {
          const isSelected = activeAgentId === agent.id;
          const statusClass = agent.status;
          
          return (
            <div
              key={agent.id}
              className={`agent-node ${statusClass} ${isSelected ? 'selected' : ''}`}
              style={{
                left: `${agent.x}px`,
                top: `${agent.y}px`,
                transform: 'translate(-50%, -50%) translate3d(0,0,0)'
              }}
              onClick={() => handleNodeClick(agent.id)}
            >
              <div className="node-status-bar">
                <span className={`node-dot ${statusClass}`}></span>
                <span className="node-status-text">{getAgentStatusText(agent.status)}</span>
              </div>
              <div className="node-content">
                <div className="node-name">{agent.name}</div>
                <div className="node-role">{agent.role}</div>
              </div>
              {agent.currentTask && agent.status !== 'idle' && (
                <div className="node-task" title={agent.currentTask}>
                  {agent.currentTask}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default AgentGraph;
