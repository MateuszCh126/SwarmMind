import { describe, it, expect } from 'vitest';
import { runHarness } from '../services/testHarness';

describe('runHarness — realne wykonanie testów', () => {
  it('zalicza, gdy kod jest poprawny a testy przechodzą', () => {
    const code = `function add(a, b) { return a + b; }`;
    const tests = `
      it('dodaje liczby', () => { expect(add(2, 3)).toBe(5); });
      it('dodaje zera', () => { expect(add(0, 0)).toBe(0); });
    `;
    const result = runHarness(code, tests);
    expect(result.success).toBe(true);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it('wykrywa błędny kod — test failuje realnie, nie symulacyjnie', () => {
    const code = `function add(a, b) { return a - b; }`; // BŁĄD: odejmuje
    const tests = `it('dodaje', () => { expect(add(2, 3)).toBe(5); });`;
    const result = runHarness(code, tests);
    expect(result.success).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.cases[0].error).toContain('to be');
  });

  it('obsługuje describe() i zagnieżdżone it()', () => {
    const code = `function isEven(n) { return n % 2 === 0; }`;
    const tests = `
      describe('isEven', () => {
        it('parzyste', () => { expect(isEven(4)).toBe(true); });
        it('nieparzyste', () => { expect(isEven(3)).toBe(false); });
      });
    `;
    const result = runHarness(code, tests);
    expect(result.success).toBe(true);
    expect(result.passed).toBe(2);
  });

  it('obsługuje matcher toThrow', () => {
    const code = `function boom() { throw new Error('nie'); }`;
    const tests = `it('rzuca', () => { expect(() => boom()).toThrow(); });`;
    const result = runHarness(code, tests);
    expect(result.success).toBe(true);
  });

  it('obsługuje toEqual dla obiektów i tablic', () => {
    const code = `function pair(a, b) { return [a, b]; }`;
    const tests = `it('para', () => { expect(pair(1, 2)).toEqual([1, 2]); });`;
    const result = runHarness(code, tests);
    expect(result.success).toBe(true);
  });

  it('obsługuje negację .not', () => {
    const code = `function id(x) { return x; }`;
    const tests = `it('nie równe', () => { expect(id(1)).not.toBe(2); });`;
    const result = runHarness(code, tests);
    expect(result.success).toBe(true);
  });

  it('zgłasza błąd składni jako niepowodzenie, nie sukces', () => {
    const code = `function broken( { return 1 }`; // niepoprawna składnia
    const tests = `it('cokolwiek', () => { expect(1).toBe(1); });`;
    const result = runHarness(code, tests);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('zgłasza brak testów zamiast fałszywego sukcesu', () => {
    const code = `function add(a, b) { return a + b; }`;
    const result = runHarness(code, '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Nie wykryto');
  });

  it('ignoruje import/export w dostarczonym kodzie', () => {
    const code = `export function add(a, b) { return a + b; }`;
    const tests = `import { x } from 'y';\nit('dodaje', () => { expect(add(1, 1)).toBe(2); });`;
    const result = runHarness(code, tests);
    expect(result.success).toBe(true);
    expect(result.passed).toBe(1);
  });

  it('miesza wyniki: część przechodzi, część nie', () => {
    const code = `function add(a, b) { return a + b; }`;
    const tests = `
      it('ok', () => { expect(add(1, 1)).toBe(2); });
      it('źle', () => { expect(add(1, 1)).toBe(3); });
    `;
    const result = runHarness(code, tests);
    expect(result.success).toBe(false);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
  });
});
