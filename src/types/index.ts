export type AgentId = 'architect' | 'coder' | 'tester' | 'reviewer';

export type AgentStatus = 'idle' | 'thinking' | 'working' | 'success' | 'error';

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  status: AgentStatus;
  currentTask: string;
  model: string;
  systemPrompt: string;
  codeContent?: string;
  testContent?: string;
  feedback?: string;
  x: number;
  y: number;
}

export interface Connection {
  from: AgentId;
  to: AgentId;
  isActive: boolean;
  status: 'idle' | 'transmitting';
}

export type LogType = 'system' | 'thought' | 'action' | 'success' | 'error' | 'code' | 'test';

export interface LogEntry {
  id: string;
  timestamp: string;
  agentId?: AgentId | 'system';
  agentName: string;
  message: string;
  type: LogType;
  details?: string;
}

export interface SwarmTask {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  assignedTo: AgentId;
}

export interface SwarmSettings {
  geminiKey: string;
  openaiKey: string;
  anthropicKey: string;
  openrouterKey: string;
  preferProvider: 'gemini' | 'openai' | 'anthropic' | 'openrouter';
}

export interface SwarmStoreState {
  agents: Record<AgentId, Agent>;
  connections: Connection[];
  logs: LogEntry[];
  tasks: SwarmTask[];
  activeTaskIndex: number;
  isRunning: boolean;
  isPaused: boolean;
  activeAgentId: AgentId | null;
  settings: SwarmSettings;
  goal: string;
  inputCode: string;
  currentStepDescription: string;
  
  // Actions
  setSettings: (settings: Partial<SwarmSettings>) => void;
  resetSwarm: () => void;
  startSwarm: (goal: string, inputCode: string) => void;
  stopSwarm: () => void;
  togglePause: () => void;
  selectAgent: (id: AgentId | null) => void;
  setAgentPrompt: (id: AgentId, prompt: string) => void;
  resetAgentPrompt: (id: AgentId) => void;
  
  // Internal Mutators
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  updateAgent: (id: AgentId, patch: Partial<Agent>) => void;
  updateConnection: (from: AgentId, to: AgentId, patch: Partial<Connection>) => void;
  updateTask: (taskId: string, patch: Partial<SwarmTask>) => void;
  setActiveTaskIndex: (index: number) => void;
  setRunningState: (isRunning: boolean) => void;
  setCurrentStepDescription: (desc: string) => void;
}
