import { create } from 'zustand';
import type { SwarmStoreState, AgentId, Agent, Connection, LogEntry, SwarmTask, SwarmSettings, LogType } from '../types';

const defaultSettings: SwarmSettings = {
  geminiKey: localStorage.getItem('swarm_geminiKey') || '',
  openaiKey: localStorage.getItem('swarm_openaiKey') || '',
  anthropicKey: localStorage.getItem('swarm_anthropicKey') || '',
  openrouterKey: localStorage.getItem('swarm_openrouterKey') || '',
  preferProvider: (localStorage.getItem('swarm_preferProvider') as 'gemini' | 'openai' | 'anthropic' | 'openrouter') || 'gemini'
};

const initialAgents: Record<AgentId, Agent> = {
  architect: {
    id: 'architect',
    name: 'AetherArchitect',
    role: 'Analizuje kod i tworzy blueprint refaktoryzacji',
    status: 'idle',
    currentTask: 'Oczekiwanie na uruchomienie...',
    model: 'Gemini 2.5 Flash / GPT-4o-mini',
    systemPrompt: `Jesteś agentem AetherArchitect w roju programistycznym. Twoim zadaniem jest analiza kodu wejściowego i celu refaktoryzacji, a następnie stworzenie dokładnego planu (blueprint) zmian. Odpowiedź MUSI być w formacie JSON zawierającym dwa pola: 'explanation' (krótkie podsumowanie analizy) oraz 'blueprint' (lista kroków i zmian technicznych). Nie pisz żadnych wstępów ani innych informacji poza poprawnym obiektem JSON.`,
    x: 400,
    y: 100
  },
  coder: {
    id: 'coder',
    name: 'ValkyrieCoder',
    role: 'Implementuje zmiany według założeń architekta',
    status: 'idle',
    currentTask: 'Oczekiwanie na plan architekta...',
    model: 'Gemini 2.5 Flash / GPT-4o-mini',
    systemPrompt: `Jesteś agentem ValkyrieCoder w roju programistycznym. Twoim zadaniem jest napisanie zrefaktoryzowanego kodu na podstawie planu dostarczonego przez Architecta oraz oryginalnego kodu. Zachowaj oryginalną funkcjonalność, popraw czytelność, wydajność i usuń antywzorce. WAŻNE: kod będzie NAPRAWDĘ uruchamiany w przeglądarce, więc pole 'code' MUSI być wykonywalnym, czystym JavaScriptem — bez składni TypeScript (żadnych adnotacji typów), bez 'import'/'export'/'require'. Typowanie dokumentuj wyłącznie komentarzami JSDoc. Funkcje zdefiniuj tak, aby były dostępne w zasięgu globalnym (deklaracje function lub const). Odpowiedź MUSI być w formacie JSON zawierającym pola: 'explanation' (podsumowanie wprowadzonych poprawek) oraz 'code' (kompletny zrefaktoryzowany kod). Nie pisz żadnego tekstu poza poprawnym obiektem JSON.`,
    x: 230,
    y: 280
  },
  tester: {
    id: 'tester',
    name: 'TracerTester',
    role: 'Tworzy testy jednostkowe uruchamiane na prawdziwym kodzie',
    status: 'idle',
    currentTask: 'Oczekiwanie na kod programisty...',
    model: 'Gemini 2.5 Flash / GPT-4o-mini',
    systemPrompt: `Jesteś agentem TracerTester w roju programistycznym. Twoim zadaniem jest napisanie testów jednostkowych dla kodu napisanego przez Codera. Testy zostaną NAPRAWDĘ wykonane na tym kodzie w izolowanym środowisku — NIE zgaduj ani nie symuluj wyników. Pisz testy w czystym JavaScript w stylu Vitest/Jest: używaj describe(), it()/test() oraz expect() z matcherami takimi jak toBe, toEqual, toBeCloseTo, toThrow, toBeGreaterThan, toContain. NIE używaj importów ('import'/'require') — describe, it, test i expect są dostępne globalnie. Odwołuj się bezpośrednio do funkcji zdefiniowanych w testowanym kodzie (są w tym samym zasięgu). KLUCZOWE: testuj FAKTYCZNY kontrakt dostarczonego kodu, a nie wyobrażony. Najpierw przeanalizuj, jak kod reaguje na dane brzegowe: jeśli dla nieprawidłowych danych (ujemne, null, undefined, nie-liczby) funkcja RZUCA błąd — sprawdzaj to przez expect(() => fn(x)).toThrow(); jeśli zwraca wartość (np. undefined) — sprawdzaj tę wartość. Nigdy nie pisz asercji sprzecznej z tym, co kod realnie robi (to psuje współpracę z Coderem). Pokryj przypadki brzegowe zgodnie z rzeczywistym zachowaniem. Odpowiedź MUSI być w formacie JSON zawierającym pola: 'explanation' (opis testów) oraz 'testCode' (kod testów). Nie pisz żadnego tekstu poza poprawnym obiektem JSON.`,
    x: 570,
    y: 280
  },
  reviewer: {
    id: 'reviewer',
    name: 'SpecterReviewer',
    role: 'Ocenia kod i raport z wykonanych testów, wydaje werdykt',
    status: 'idle',
    currentTask: 'Oczekiwanie na kod i wyniki testów...',
    model: 'Gemini 2.5 Flash / GPT-4o-mini',
    systemPrompt: `Jesteś agentem SpecterReviewer w roju programistycznym. Oceniasz kod Codera i testy Testera. PRÓG AKCEPTACJI: zatwierdź (approved: true), gdy kod realizuje CEL refaktoryzacji ORAZ wszystkie testy przeszły. Skup się na tym, czy CEL został osiągnięty — nie odrzucaj w nieskończoność za ulepszenia wykraczające poza cel (np. dodatkowa walidacja wejścia, której cel nie wymagał, albo styl). Jeśli wszystkie testy są zielone i cel spełniony, to jest sukces — zatwierdź. Odrzucaj (approved: false) tylko, gdy cel NIE jest spełniony albo testy realnie oblewają — a wtedy feedback musi być KONKRETNY, wykonalny w jednej iteracji i wskazywać dokładnie, co poprawić (współpracujesz z Coderem, nie utrudniasz). Odpowiedź MUSI być w formacie JSON zawierającym pola: 'explanation' (zwięzły przegląd), 'approved' (true lub false) oraz 'feedback' (konkretne, uprzejme uwagi albo potwierdzenie zatwierdzenia). Nie pisz żadnego tekstu poza poprawnym obiektem JSON.`,
    x: 400,
    y: 460
  }
};

const initialConnections: Connection[] = [
  { from: 'architect', to: 'coder', isActive: false, status: 'idle' },
  { from: 'coder', to: 'tester', isActive: false, status: 'idle' },
  { from: 'tester', to: 'reviewer', isActive: false, status: 'idle' },
  { from: 'reviewer', to: 'coder', isActive: false, status: 'idle' }
];

const initialTasks: SwarmTask[] = [
  { id: 'task_analysis', name: 'Analiza kodu i planowanie refaktoryzacji', status: 'pending', assignedTo: 'architect' },
  { id: 'task_coding', name: 'Implementacja zrefaktoryzowanego kodu', status: 'pending', assignedTo: 'coder' },
  { id: 'task_testing', name: 'Generowanie i uruchomienie testów jednostkowych', status: 'pending', assignedTo: 'tester' },
  { id: 'task_review', name: 'Przegląd kodu (Code Review) i zatwierdzenie', status: 'pending', assignedTo: 'reviewer' }
];

export const useSwarmStore = create<SwarmStoreState>((set, get) => ({
  agents: structuredClone(initialAgents),
  connections: structuredClone(initialConnections),
  logs: [],
  tasks: structuredClone(initialTasks),
  activeTaskIndex: 0,
  isRunning: false,
  isPaused: false,
  activeAgentId: null,
  settings: defaultSettings,
  goal: '',
  inputCode: '',
  currentStepDescription: 'Gotowy do rozpoczęcia nowej sesji.',

  setSettings: (newSettings) => {
    set((state) => {
      const settings = { ...state.settings, ...newSettings };
      
      // Persist in localStorage
      if (newSettings.geminiKey !== undefined) localStorage.setItem('swarm_geminiKey', newSettings.geminiKey);
      if (newSettings.openaiKey !== undefined) localStorage.setItem('swarm_openaiKey', newSettings.openaiKey);
      if (newSettings.anthropicKey !== undefined) localStorage.setItem('swarm_anthropicKey', newSettings.anthropicKey);
      if (newSettings.openrouterKey !== undefined) localStorage.setItem('swarm_openrouterKey', newSettings.openrouterKey);
      if (newSettings.preferProvider !== undefined) localStorage.setItem('swarm_preferProvider', newSettings.preferProvider);
      
      return { settings };
    });
  },

  resetSwarm: () => {
    set({
      agents: JSON.parse(JSON.stringify(initialAgents)),
      connections: JSON.parse(JSON.stringify(initialConnections)),
      logs: [
        {
          id: `sys_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          agentName: 'System',
          message: 'Zresetowano stan roju agentów.',
          type: 'system'
        }
      ],
      tasks: JSON.parse(JSON.stringify(initialTasks)),
      activeTaskIndex: 0,
      isRunning: false,
      isPaused: false,
      activeAgentId: null,
      currentStepDescription: 'Stan zresetowany. Wprowadź kod i kliknij "Uruchom Swarm".'
    });
  },

  startSwarm: (goal, inputCode) => {
    const systemLog: LogEntry = {
      id: `sys_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      agentName: 'System',
      message: `Uruchomiono rój z celem: "${goal}"`,
      type: 'system'
    };

    set({
      agents: JSON.parse(JSON.stringify(initialAgents)),
      connections: JSON.parse(JSON.stringify(initialConnections)),
      logs: [systemLog],
      tasks: JSON.parse(JSON.stringify(initialTasks)),
      activeTaskIndex: 0,
      isRunning: true,
      isPaused: false,
      goal,
      inputCode,
      currentStepDescription: 'Inicjalizacja zadań. AetherArchitect rozpoczyna analizę.'
    });
  },

  stopSwarm: () => {
    get().addLog({
      agentName: 'System',
      message: 'Zatrzymano działanie roju agentów.',
      type: 'system'
    });
    set({
      isRunning: false,
      isPaused: false,
      currentStepDescription: 'Praca roju została zatrzymana przez użytkownika.'
    });
  },

  togglePause: () => {
    set((state) => {
      const isPaused = !state.isPaused;
      const msg = isPaused ? 'Wstrzymano działanie roju.' : 'Wznowiono działanie roju.';
      
      // Append logs manually so we don't trigger state override
      const logs = [
        ...state.logs,
        {
          id: `sys_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          agentName: 'System',
          message: msg,
          type: 'system' as LogType
        }
      ];

      return { isPaused, logs };
    });
  },


  selectAgent: (id) => {
    set({ activeAgentId: id });
  },

  addLog: (log) => {
    const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toLocaleTimeString();
    
    set((state) => ({
      logs: [...state.logs, { ...log, id, timestamp }]
    }));
  },

  updateAgent: (id, patch) => {
    set((state) => {
      const agent = state.agents[id];
      if (!agent) return {};
      
      return {
        agents: {
          ...state.agents,
          [id]: { ...agent, ...patch }
        }
      };
    });
  },

  updateConnection: (from, to, patch) => {
    set((state) => ({
      connections: state.connections.map((c) =>
        c.from === from && c.to === to ? { ...c, ...patch } : c
      )
    }));
  },

  updateTask: (taskId, patch) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
    }));
  },

  setActiveTaskIndex: (index) => {
    set({ activeTaskIndex: index });
  },

  setRunningState: (isRunning) => {
    set({ isRunning });
  },

  setCurrentStepDescription: (desc) => {
    set({ currentStepDescription: desc });
  }
}));
