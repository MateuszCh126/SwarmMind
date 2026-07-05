import { describe, it, expect, beforeEach } from 'vitest';
import { loadHistory, saveRun, clearHistory, type RunRecord } from '../utils/runHistory';

const rec = (id: string): RunRecord => ({
  id,
  timestamp: '2026-01-01',
  goal: 'g',
  provider: 'openrouter',
  outcome: 'success',
  iterations: 1,
  inputCode: 'a',
  blueprint: 'b',
  code: 'c',
  tests: 't',
  testResults: 'PASS',
  reviewerFeedback: 'ok',
  summary: 's',
});

describe('runHistory — trwała historia przebiegów', () => {
  beforeEach(() => clearHistory());

  it('zapisuje i wczytuje przebieg', () => {
    saveRun(rec('r1'));
    const h = loadHistory();
    expect(h.length).toBe(1);
    expect(h[0].id).toBe('r1');
  });

  it('najnowszy przebieg jest pierwszy', () => {
    saveRun(rec('r1'));
    saveRun(rec('r2'));
    expect(loadHistory()[0].id).toBe('r2');
  });

  it('ogranicza historię do 20 wpisów', () => {
    for (let i = 0; i < 25; i++) saveRun(rec(`r${i}`));
    expect(loadHistory().length).toBe(20);
  });

  it('czyści historię', () => {
    saveRun(rec('r1'));
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });
});
