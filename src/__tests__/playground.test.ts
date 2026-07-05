import { describe, it, expect } from 'vitest';
import { runExpression } from '../services/testHarness';

describe('runExpression — Playground (realne wykonanie wyrażenia)', () => {
  it('zwraca wartość wyrażenia liczoną na kodzie użytkownika', () => {
    const r = runExpression('function fib(n){return n<2?n:fib(n-1)+fib(n-2);}', 'fib(10)');
    expect(r.ok).toBe(true);
    expect(r.value).toBe('55');
  });

  it('przechwytuje console.log', () => {
    const r = runExpression('function f(){ console.log("hi", 42); return 1; }', 'f()');
    expect(r.ok).toBe(true);
    expect(r.value).toBe('1');
    expect(r.logs).toContain('hi');
    expect(r.logs).toContain('42');
  });

  it('zwraca błąd dla niepoprawnego wyrażenia (nie symuluje sukcesu)', () => {
    const r = runExpression('function f(){ return 1; }', 'nieistnieje()');
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it('ignoruje export w kodzie i liczy poprawnie', () => {
    const r = runExpression('export function sq(n){ return n*n; }', 'sq(9)');
    expect(r.ok).toBe(true);
    expect(r.value).toBe('81');
  });

  it('puste wyrażenie zwraca czytelny błąd', () => {
    const r = runExpression('const x = 1;', '   ');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/wyrażenie/i);
  });
});
