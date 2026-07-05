import { useState } from 'react';
import StatusHeader from './components/StatusHeader';
import Sidebar from './components/Sidebar';
import AgentGraph from './components/AgentGraph';
import TerminalFeed from './components/TerminalFeed';
import AgentInspector from './components/AgentInspector';
import SettingsModal from './components/SettingsModal';
import './App.css';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="app-container">
      <StatusHeader onOpenSettings={() => setIsSettingsOpen(true)} />
      
      <div className="main-layout">
        <Sidebar />
        
        <div className="center-workspace">
          <AgentGraph />
          <TerminalFeed />
        </div>
        
        <AgentInspector />
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}

export default App;
