import { describe, it, expect, beforeEach } from 'vitest';
import { useSwarmStore } from '../store/useSwarmStore';

describe('useSwarmStore Zustand Store', () => {
  beforeEach(() => {
    useSwarmStore.getState().resetSwarm();
  });

  it('should initialize with correct default state', () => {
    const state = useSwarmStore.getState();
    expect(state.isRunning).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.agents.architect.name).toBe('AetherArchitect');
    expect(state.agents.coder.status).toBe('idle');
    expect(state.connections.length).toBe(4);
    expect(state.tasks.length).toBe(4);
  });

  it('should start the swarm and update running state', () => {
    const store = useSwarmStore.getState();
    store.startSwarm('Refactor this code', 'const x = 1;');

    const state = useSwarmStore.getState();
    expect(state.isRunning).toBe(true);
    expect(state.goal).toBe('Refactor this code');
    expect(state.inputCode).toBe('const x = 1;');
    expect(state.logs.length).toBe(1);
    expect(state.logs[0].message).toContain('Uruchomiono rój z celem');
  });

  it('should add a log entry', () => {
    const store = useSwarmStore.getState();
    store.addLog({
      agentId: 'architect',
      agentName: 'AetherArchitect',
      message: 'Hello World',
      type: 'thought'
    });

    const state = useSwarmStore.getState();
    // 2 logs because resetSwarm adds a reset log, and we added Hello World
    expect(state.logs.length).toBe(2);
    expect(state.logs[1].message).toBe('Hello World');
    expect(state.logs[1].agentId).toBe('architect');
    expect(state.logs[1].type).toBe('thought');
  });

  it('should update agent state fields', () => {
    const store = useSwarmStore.getState();
    store.updateAgent('coder', {
      status: 'thinking',
      currentTask: 'Writing tests'
    });

    const state = useSwarmStore.getState();
    expect(state.agents.coder.status).toBe('thinking');
    expect(state.agents.coder.currentTask).toBe('Writing tests');
  });

  it('should toggle pause state', () => {
    const store = useSwarmStore.getState();
    expect(store.isPaused).toBe(false);

    store.togglePause();
    expect(useSwarmStore.getState().isPaused).toBe(true);

    store.togglePause();
    expect(useSwarmStore.getState().isPaused).toBe(false);
  });

  it('should reset the swarm to initial values', () => {
    const store = useSwarmStore.getState();
    store.startSwarm('Do X', 'let y = 1;');
    store.updateAgent('reviewer', { status: 'success' });
    
    store.resetSwarm();
    const state = useSwarmStore.getState();
    expect(state.isRunning).toBe(false);
    expect(state.agents.reviewer.status).toBe('idle');
    expect(state.logs.length).toBe(1); // just the reset log
  });
});
